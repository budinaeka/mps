const API_URL = 'api/index.php';

let _cache = {
    users: [],
    pengobatan: [],
    vaksinasi: [],
    monitoring: [],
    surveilans: [],
    phms: [],
    surat: [],
    stok_obat: [],
    pemakaian_obat: [],
    kegiatan_lain: [],
    kunjungan_tamu: [],
    kreasi_konten: []
};

const DB = {
    init: async () => {
        try {
            const tables = [
                'users', 'pengobatan', 'vaksinasi', 'monitoring', 
                'surveilans', 'phms', 'surat', 'stok_obat', 'pemakaian_obat', 
                'kegiatan_lain', 'kunjungan_tamu', 'kreasi_konten'
            ];

            const promises = tables.map(table => 
                fetch(`${API_URL}?table=${table}`)
                    .then(res => res.json())
                    .then(data => {
                        _cache[table] = Array.isArray(data) ? data : [];
                    })
                    .catch(err => {
                        console.error(`Error loading ${table}:`, err);
                        _cache[table] = [];
                    })
            );

            await Promise.all(promises);
            console.log('Database initialized and data loaded');
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    },

    get: () => {
        return _cache;
    },

    // Helpers
    getTable: (table) => {
        return _cache[table] || [];
    },

    addToTable: (table, item) => {
        if (!_cache[table]) _cache[table] = [];
        
        // Optimistic update
        // We don't have ID yet, but we need one for UI. 
        // We'll use a temp ID and replace it later or just refresh.
        // Since the UI reloads page content often, we might need to handle this carefully.
        // For simplicity, we'll send request and wait for response if we want real ID, 
        // but existing code expects sync return.
        
        // Strategy: Send async request. 
        // Return item with temp ID (timestamp) so UI doesn't break.
        // In background, the server will assign real ID. 
        // Next time we fetch (e.g. page reload), we get real ID.
        // Ideally we should update the cache with the response from server.
        
        const tempId = Date.now();
        const payload = { ...item };
        
        // We won't add 'id' to payload sent to server (server handles it), 
        // but we add it to local cache for immediate display.
        const localItem = { ...payload, id: tempId, created_at: new Date().toISOString() };
        _cache[table].push(localItem);

        fetch(`${API_URL}?table=${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(savedItem => {
            // Update the local item with real ID and data from server
            const index = _cache[table].findIndex(i => i.id === tempId);
            if (index !== -1) {
                _cache[table][index] = savedItem;
            }
        })
        .catch(err => console.error(`Error adding to ${table}:`, err));

        return localItem;
    },

    updateInTable: (table, id, updates) => {
        if (!_cache[table]) return false;
        const index = _cache[table].findIndex(i => i.id == id);
        if (index !== -1) {
            // Optimistic update
            _cache[table][index] = { ..._cache[table][index], ...updates };

            fetch(`${API_URL}?table=${table}&id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            }).catch(err => console.error(`Error updating ${table}:`, err));

            return true;
        }
        return false;
    },

    deleteFromTable: (table, id) => {
        if (!_cache[table]) return false;
        
        // Optimistic update
        const prevData = [..._cache[table]];
        _cache[table] = _cache[table].filter(i => i.id != id);

        fetch(`${API_URL}?table=${table}&id=${id}`, {
            method: 'DELETE'
        }).catch(err => {
            console.error(`Error deleting from ${table}:`, err);
            // Revert if failed (optional, but good practice)
            _cache[table] = prevData;
        });

        return true;
    },

    // Nested helpers (e.g., vaksinasi.pmk)
    // In MySQL version, these are flat tables with a 'type' column.
    // So 'vaksinasi' table has 'type' column.
    
    getNested: (parent, child) => {
        // parent is table name (e.g., 'vaksinasi')
        // child is type value (e.g., 'pmk')
        const rows = _cache[parent] || [];
        return rows.filter(r => r.type === child);
    },

    addToNested: (parent, child, item) => {
        // parent is table, child is type
        if (!_cache[parent]) _cache[parent] = [];
        
        const payload = { ...item, type: child };
        const tempId = Date.now();
        const localItem = { ...payload, id: tempId, created_at: new Date().toISOString() };
        
        _cache[parent].push(localItem);

        fetch(`${API_URL}?table=${parent}&type=${child}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(savedItem => {
            const index = _cache[parent].findIndex(i => i.id === tempId);
            if (index !== -1) {
                _cache[parent][index] = savedItem;
            }
        })
        .catch(err => console.error(`Error adding to ${parent}/${child}:`, err));

        return localItem;
    },

    updateNested: (parent, child, id, updates) => {
        if (!_cache[parent]) return false;
        const index = _cache[parent].findIndex(i => i.id == id && i.type === child);
        if (index !== -1) {
            _cache[parent][index] = { ..._cache[parent][index], ...updates };

            fetch(`${API_URL}?table=${parent}&id=${id}&type=${child}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            }).catch(err => console.error(`Error updating ${parent}/${child}:`, err));

            return true;
        }
        return false;
    },

    deleteFromNested: (parent, child, id) => {
        if (!_cache[parent]) return false;
        
        const prevData = [..._cache[parent]];
        _cache[parent] = _cache[parent].filter(i => !(i.id == id && i.type === child));

        fetch(`${API_URL}?table=${parent}&id=${id}&type=${child}`, {
            method: 'DELETE'
        }).catch(err => {
            console.error(`Error deleting from ${parent}/${child}:`, err);
            _cache[parent] = prevData;
        });

        return true;
    }
};
