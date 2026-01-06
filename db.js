const API_URL = 'backend/api.php';

const DB = {
    init: () => {
        // No init needed for REST API, but kept for compatibility if needed later
        console.log('DB Initialized with MySQL Backend');
    },

    // Helpers
    getTable: async (table) => {
        try {
            const response = await fetch(`${API_URL}?table=${table}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching table:', table, error);
            return [];
        }
    },

    addToTable: async (table, item) => {
        try {
            const response = await fetch(`${API_URL}?table=${table}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(item),
            });
            return await response.json();
        } catch (error) {
            console.error('Error adding to table:', table, error);
            return null;
        }
    },

    updateInTable: async (table, id, updates) => {
        try {
            const response = await fetch(`${API_URL}?table=${table}&id=${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });
            const res = await response.json();
            return res.success || false;
        } catch (error) {
            console.error('Error updating table:', table, error);
            return false;
        }
    },

    deleteFromTable: async (table, id) => {
        try {
            const response = await fetch(`${API_URL}?table=${table}&id=${id}`, {
                method: 'DELETE',
            });
            const res = await response.json();
            return res.success || false;
        } catch (error) {
            console.error('Error deleting from table:', table, error);
            return false;
        }
    },

    // Nested helpers (e.g., vaksinasi.pmk)
    // In MySQL version, we filter by 'type' column
    getNested: async (parent, child) => {
        try {
            const response = await fetch(`${API_URL}?table=${parent}&type=${child}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching nested:', parent, child, error);
            return [];
        }
    },

    addToNested: async (parent, child, item) => {
        const payload = { ...item, type: child };
        return await DB.addToTable(parent, payload);
    },

    updateNested: async (parent, child, id, updates) => {
        return await DB.updateInTable(parent, id, updates);
    },

    deleteFromNested: async (parent, child, id) => {
        return await DB.deleteFromTable(parent, id);
    }
};
