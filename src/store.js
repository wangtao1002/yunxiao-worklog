/**
 * YXWT.store —— chrome.storage.local 封装（SPEC 第 2 节）
 * content script 与 options 页面共用，因此不得依赖 DOM / 云效页面上下文。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  const DEFAULTS = {
    version: 1,
    fieldMap: {},        // { [orgId]: FieldMap }
    contacts: {},        // { [orgId]: { [userId]: {id, name, avatar} } }
    // 身份缓存，按组织分桶。不分桶会导致 me() 一次失败就把上个组织的身份/orgId 顶上来，
    // 进而用 A 组织的工时字段 id 去读写 B 组织的工作项（字段 id 跨组织不通用）。
    contextByOrg: {},    // { [orgId]: {userId, name, avatar, orgId, orgName} }
    context: null,       // 最后一次成功识别的身份，仅在推不出当前组织时作降级回退
    // 团队视图里额外纳入的 userId，同样必须按组织分桶：userId 只在本组织有意义
    membersByOrg: {},    // { [orgId]: [userId] }
    prefs: {
      dailyTargetHours: 8,
      dateBasis: 'planEnd',      // 'planEnd' | 'finishTime' | 'planStart'
      defaultRange: 'thisWeek',
      members: [],               // 【已废弃】旧的扁平成员数组，仅用于一次性迁移到 membersByOrg
      showSummaryBar: true,
      excludeCancelled: true,    // 统计时是否排除「已取消」状态
      // 没填「预计工时」的任务是否标红置顶提醒（字段没识别出来时无论开关如何都不提醒）
      warnMissingEst: true,
      theme: 'auto',             // 'auto' | 'light' | 'dark'
      // 写入模式默认只读预演（SPEC 7/11：首次使用必须是 dry-run），
      // 显式给默认值，避免调用方读到 undefined 被当成 false 而真的写回云效。
      dryRun: true
    }
  };

  // 通讯录姓名字段的取值优先级（云效不同接口返回的字段名不一致）
  const NAME_KEYS = ['realName', 'displayName', 'nickName', 'name'];

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function clone(v) {
    if (Array.isArray(v)) {
      return v.map(clone);
    }
    if (isPlainObject(v)) {
      const out = {};
      Object.keys(v).forEach(function (k) {
        out[k] = clone(v[k]);
      });
      return out;
    }
    return v;
  }

  function deepFreeze(v) {
    if (Array.isArray(v) || isPlainObject(v)) {
      Object.keys(v).forEach(function (k) {
        deepFreeze(v[k]);
      });
      Object.freeze(v);
    }
    return v;
  }

  /**
   * 深合并：以 defaults 为骨架，stored 覆盖。
   * - stored 里 defaults 没有的键原样保留（例如 prefs._writeEndpoint）
   * - 结构不符（默认是对象/数组但存的是标量）时退回默认值，防止老脏数据把 UI 打崩
   */
  function deepMerge(defaults, stored) {
    const out = clone(defaults);
    if (!isPlainObject(stored)) {
      return out;
    }
    Object.keys(stored).forEach(function (k) {
      const dv = out[k];
      const sv = stored[k];
      if (sv === undefined) {
        return;
      }
      if (isPlainObject(dv) && isPlainObject(sv)) {
        out[k] = deepMerge(dv, sv);
      } else if (isPlainObject(dv) || (Array.isArray(dv) && !Array.isArray(sv))) {
        return;
      } else {
        out[k] = clone(sv);
      }
    });
    return out;
  }

  function localArea() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return null;
    }
    return chrome.storage.local;
  }

  // 传回调调用，MV3 的 Promise 形式和回调形式都能兼容；同时统一处理 lastError
  function callArea(method, arg) {
    const area = localArea();
    if (!area) {
      return Promise.reject(new Error('chrome.storage.local 不可用'));
    }
    return new Promise(function (resolve, reject) {
      let ret;
      const done = function (res) {
        const err = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message || '读写本地存储失败'));
          return;
        }
        resolve(res);
      };
      try {
        ret = arg === undefined ? area[method](done) : area[method](arg, done);
      } catch (e) {
        reject(e);
        return;
      }
      if (ret && typeof ret.then === 'function') {
        ret.then(resolve, reject);
      }
    });
  }

  function rawGet() {
    return callArea('get', null);
  }

  function rawSet(payload) {
    return callArea('set', payload);
  }

  // 读-改-写串行化，避免多个模块（detect / panel / summarybar / options）并发写互相覆盖
  let queue = Promise.resolve();

  function enqueue(task) {
    const next = queue.then(task, task);
    queue = next.then(function () {}, function () {});
    return next;
  }

  function get() {
    return rawGet().then(function (raw) {
      return deepMerge(DEFAULTS, raw);
    });
  }

  // 浅合并顶层 key（chrome.storage.set 本身就是顶层覆盖语义）
  function set(patch) {
    if (!isPlainObject(patch) || Object.keys(patch).length === 0) {
      return get();
    }
    const payload = {};
    Object.keys(patch).forEach(function (k) {
      payload[k] = clone(patch[k]);
    });
    return enqueue(function () {
      return rawSet(payload).then(get);
    });
  }

  function setPrefs(patch) {
    if (!isPlainObject(patch) || Object.keys(patch).length === 0) {
      return get();
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const prefs = Object.assign({}, cfg.prefs, clone(patch));
        return rawSet({ prefs: prefs }).then(function () {
          cfg.prefs = prefs;
          return cfg;
        });
      });
    });
  }

  function getFieldMap(orgId) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve(null);
    }
    return get().then(function (cfg) {
      const map = cfg.fieldMap[key];
      return isPlainObject(map) ? map : null;
    });
  }

  /**
   * 写入字段映射。
   * - map 为 null/undefined 表示清除该组织的映射（设置页「重新探测」前置动作）
   * - 已存的是 manual:true 时，非手动来源（探测结果）不得覆盖，直接返回已存的
   */
  function setFieldMap(orgId, map) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve(null);
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const all = cfg.fieldMap;
        const old = isPlainObject(all[key]) ? all[key] : null;

        if (map === null || map === undefined) {
          if (!old) {
            return null;
          }
          delete all[key];
          return rawSet({ fieldMap: all }).then(function () {
            return null;
          });
        }
        if (!isPlainObject(map)) {
          return old ? clone(old) : null;
        }
        if (old && old.manual === true && map.manual !== true) {
          return clone(old);
        }

        const next = clone(map);
        next.manual = map.manual === true;
        next.detectedAt = typeof map.detectedAt === 'number' ? map.detectedAt : Date.now();
        all[key] = next;
        return rawSet({ fieldMap: all }).then(function () {
          return clone(next);
        });
      });
    });
  }

  /**
   * 一次性迁移：把旧的扁平 prefs.members 拆进 membersByOrg。
   * 归属判据：成员只能通过成员选择器勾选，而选择器只列当前组织的通讯录，
   * 所以「属于组织 X 的成员」恰好等于 legacy ∩ keys(contacts[X])——按此拆分不会张冠李戴。
   * 返回 null 表示无需迁移。
   */
  function migrateMembers(cfg) {
    const legacy = Array.isArray(cfg.prefs.members) ? cfg.prefs.members : [];
    if (!legacy.length) {
      return null;
    }
    const byOrg = isPlainObject(cfg.membersByOrg) ? clone(cfg.membersByOrg) : {};
    Object.keys(cfg.contacts || {}).forEach(function (org) {
      const book = isPlainObject(cfg.contacts[org]) ? cfg.contacts[org] : {};
      const mine = legacy.filter(function (id) {
        return Object.prototype.hasOwnProperty.call(book, String(id));
      });
      if (!mine.length) {
        return;
      }
      const cur = Array.isArray(byOrg[org]) ? byOrg[org] : [];
      const merged = cur.slice();
      mine.forEach(function (id) {
        if (merged.indexOf(id) < 0) {
          merged.push(id);
        }
      });
      byOrg[org] = merged;
    });
    // 认不出归属的旧 id 直接丢弃：宁可让用户重勾一次，也不能把 A 组织的人算进 B 组织
    return { membersByOrg: byOrg, prefs: Object.assign({}, cfg.prefs, { members: [] }) };
  }

  function getMembers(orgId) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve([]);
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const patch = migrateMembers(cfg);
        if (!patch) {
          const cur = cfg.membersByOrg[key];
          return Array.isArray(cur) ? clone(cur) : [];
        }
        return rawSet(patch).then(function () {
          const cur = patch.membersByOrg[key];
          return Array.isArray(cur) ? clone(cur) : [];
        });
      });
    });
  }

  function setMembers(orgId, ids) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve([]);
    }
    const list = (Array.isArray(ids) ? ids : []).map(String).filter(Boolean);
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const patch = migrateMembers(cfg);
        const byOrg = patch ? patch.membersByOrg : clone(cfg.membersByOrg);
        byOrg[key] = list.slice();
        const payload = { membersByOrg: byOrg };
        if (patch) {
          payload.prefs = patch.prefs;
        }
        return rawSet(payload).then(function () {
          return list.slice();
        });
      });
    });
  }

  function getContext(orgId) {
    const key = String(orgId || '');
    return get().then(function (cfg) {
      if (key) {
        const hit = cfg.contextByOrg[key];
        if (isPlainObject(hit) && hit.userId) {
          return clone(hit);
        }
        return null;
      }
      // 不知道当前组织时才退回「最后一次成功的身份」，调用方必须把它当降级数据处理
      const last = cfg.context;
      return isPlainObject(last) && last.userId ? clone(last) : null;
    });
  }

  function setContext(ctx) {
    if (!isPlainObject(ctx) || !ctx.userId) {
      return Promise.resolve(null);
    }
    const key = String(ctx.orgId || '');
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const byOrg = clone(cfg.contextByOrg);
        if (key) {
          byOrg[key] = clone(ctx);
        }
        return rawSet({ context: clone(ctx), contextByOrg: byOrg }).then(function () {
          return clone(ctx);
        });
      });
    });
  }

  function getContacts(orgId) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve({});
    }
    return get().then(function (cfg) {
      const book = cfg.contacts[key];
      return isPlainObject(book) ? book : {};
    });
  }

  // 把云效各接口返回的人员对象归一成 {id, name, avatar}；不合格的返回 null
  function pickUser(u) {
    if (!isPlainObject(u)) {
      return null;
    }
    if (u.isDeleted === true || u.isDisabled === true) {
      return null;
    }
    const id = String(u.identifier || u.id || '').trim();
    if (!id) {
      return null;
    }
    let name = '';
    for (let i = 0; i < NAME_KEYS.length; i++) {
      const v = u[NAME_KEYS[i]];
      if (typeof v === 'string' && v.trim()) {
        name = v.trim();
        break;
      }
    }
    const avatarRaw = u.avatar || u.avatarUrl || '';
    return {
      id: id,
      name: name,
      avatar: typeof avatarRaw === 'string' ? avatarRaw.trim() : ''
    };
  }

  function addContacts(orgId, users) {
    const key = String(orgId || '');
    const list = Array.isArray(users) ? users : (users ? [users] : []);
    if (!key) {
      return Promise.resolve({});
    }
    if (!list.length) {
      return getContacts(key);
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const all = cfg.contacts;
        const book = isPlainObject(all[key]) ? all[key] : {};
        let changed = false;

        list.forEach(function (u) {
          const picked = pickUser(u);
          if (!picked) {
            return;
          }
          const old = isPlainObject(book[picked.id]) ? book[picked.id] : null;
          // 已有的 name/avatar 只有在新值非空时才被覆盖
          const merged = {
            id: picked.id,
            name: picked.name || (old && old.name) || '',
            avatar: picked.avatar || (old && old.avatar) || ''
          };
          if (!old || old.name !== merged.name || old.avatar !== merged.avatar) {
            changed = true;
          }
          book[picked.id] = merged;
        });

        if (!changed) {
          return clone(book);
        }
        all[key] = book;
        return rawSet({ contacts: all }).then(function () {
          return clone(book);
        });
      });
    });
  }

  function removeContact(orgId, userId) {
    const key = String(orgId || '');
    const uid = String(userId || '');
    if (!key || !uid) {
      return Promise.resolve({});
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const all = cfg.contacts;
        const book = isPlainObject(all[key]) ? all[key] : {};
        if (!Object.prototype.hasOwnProperty.call(book, uid)) {
          return clone(book);
        }
        delete book[uid];
        all[key] = book;

        const payload = { contacts: all };
        // 顺手把团队视图里指向该人的选择清掉，免得留下查不到名字的悬空 id。
        // 只动 orgId 这一桶：在 B 组织删同事不该影响 A 组织已勾选的成员。
        const mig = migrateMembers(cfg);
        const byOrg = mig ? mig.membersByOrg : clone(cfg.membersByOrg);
        if (mig) {
          payload.prefs = mig.prefs;
        }
        const members = Array.isArray(byOrg[key]) ? byOrg[key] : [];
        const kept = members.filter(function (m) {
          return String(m) !== uid;
        });
        if (kept.length !== members.length || mig) {
          byOrg[key] = kept;
          payload.membersByOrg = byOrg;
        }
        return rawSet(payload).then(function () {
          return clone(book);
        });
      });
    });
  }

  /**
   * 监听本地配置变化。cb(cfg, changes)，cfg 是合并后的完整配置。
   * 返回取消监听的函数。
   */
  function onChange(cb) {
    const noop = function () {};
    if (typeof cb !== 'function') {
      return noop;
    }
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
      return noop;
    }
    const handler = function (changes, areaName) {
      if (areaName !== 'local') {
        return;
      }
      get().then(function (cfg) {
        try {
          cb(cfg, changes);
        } catch (e) {
          console.warn('[YXWT.store] onChange 回调异常', e);
        }
      }, function (e) {
        console.warn('[YXWT.store] onChange 读取配置失败', e);
      });
    };
    chrome.storage.onChanged.addListener(handler);
    return function () {
      chrome.storage.onChanged.removeListener(handler);
    };
  }

  // 设置页「清除全部本地数据」用
  function clear() {
    return enqueue(function () {
      return callArea('clear').then(function () {
        return clone(DEFAULTS);
      });
    });
  }

  NS.store = {
    DEFAULTS: deepFreeze(clone(DEFAULTS)),
    get: get,
    set: set,
    setPrefs: setPrefs,
    getFieldMap: getFieldMap,
    setFieldMap: setFieldMap,
    getMembers: getMembers,
    setMembers: setMembers,
    getContext: getContext,
    setContext: setContext,
    getContacts: getContacts,
    addContacts: addContacts,
    removeContact: removeContact,
    onChange: onChange,
    clear: clear
  };
})();
