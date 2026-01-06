const App = {
    state: {
        currentUser: null,
        currentRoute: 'login'
    },

    init: async () => {
        await DB.init();
        App.checkAuth();
        window.addEventListener('hashchange', App.handleRoute);
        App.handleRoute(); // Initial load
    },

    checkAuth: () => {
        const user = localStorage.getItem('puskeswan_user');
        if (user) {
            App.state.currentUser = JSON.parse(user);
        }
    },

    handleRoute: () => {
        const hash = window.location.hash.slice(1) || 'dashboard';
        
        // If not logged in, force login
        if (!App.state.currentUser && hash !== 'login') {
            window.location.hash = 'login';
            return;
        }

        // If logged in and trying to go to login, go to dashboard
        if (App.state.currentUser && hash === 'login') {
            window.location.hash = 'dashboard';
            return;
        }

        App.state.currentRoute = hash;
        App.render();
    },

    render: () => {
        const appDiv = document.getElementById('app');
        
        if (App.state.currentRoute === 'login') {
            appDiv.innerHTML = Views.login();
            App.bindLoginEvents();
        } else {
            // Dashboard Layout
            appDiv.innerHTML = Views.layout(App.state.currentRoute);
            App.bindLayoutEvents();
            App.loadPageContent(App.state.currentRoute);
        }
    },

    bindLoginEvents: () => {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = form.username.value;
                const password = form.password.value;
                
                const db = DB.get();
                const user = db.users.find(u => u.username === username && u.password === password);

                if (user) {
                    localStorage.setItem('puskeswan_user', JSON.stringify(user));
                    App.state.currentUser = user;
                    window.location.hash = 'dashboard';
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Gagal',
                        text: 'Username atau password salah!'
                    });
                }
            });
        }
    },

    bindLayoutEvents: () => {
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('puskeswan_user');
            App.state.currentUser = null;
            window.location.hash = 'login';
        });
        window.addEventListener('beforeprint', () => {
            const footer = document.getElementById('print-footer');
            if (footer) {
                const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const tgl = new Date().toLocaleDateString('id-ID', opts);
                footer.textContent = `print from myPuskeswanSukalarang on ${tgl}`;
            }
        });
    },

    loadPageContent: (route) => {
        const contentDiv = document.getElementById('main-content');
        if (!contentDiv) return;

        // Simple router mapping
        if (route === 'dashboard') {
            contentDiv.innerHTML = Views.dashboard();
            App.initDashboardCharts();
        } else if (route === 'users') {
            contentDiv.innerHTML = Views.users();
            App.initUserEvents();
        } else if (route === 'pengobatan') {
            contentDiv.innerHTML = Views.pengobatan();
            App.initPengobatanEvents();
        } else if (route === 'vaksinasi') {
            contentDiv.innerHTML = Views.vaksinasi();
            App.initVaksinasiEvents();
        } else if (route === 'monitoring') {
            contentDiv.innerHTML = Views.monitoring();
            App.initMonitoringEvents();
        } else if (route === 'surveilans') {
            contentDiv.innerHTML = Views.surveilans();
            App.initSurveilansEvents();
        } else if (route === 'surat') {
            contentDiv.innerHTML = Views.surat();
            App.initSuratEvents();
        } else if (route === 'stok') {
            contentDiv.innerHTML = Views.stok();
            App.initStokEvents();
        } else if (route === 'kegiatan_lain') {
            contentDiv.innerHTML = Views.kegiatan_lain();
            App.initKegiatanLainEvents();
        } else if (route === 'kunjungan_tamu') {
            contentDiv.innerHTML = Views.kunjungan_tamu();
            App.initKunjunganTamuEvents();
        } else {
            contentDiv.innerHTML = `<h1>404 Not Found</h1>`;
        }
    },

    initDashboardCharts: () => {
        const ctx = document.getElementById('serviceChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Pengobatan', 'Vaksinasi', 'Surveilans'],
                    datasets: [{
                        label: 'Layanan Bulan Ini',
                        data: [
                            DB.getTable('pengobatan').length,
                            DB.getNested('vaksinasi', 'pmk').length + DB.getNested('vaksinasi', 'rabies').length,
                            DB.getTable('surveilans').length
                        ],
                        backgroundColor: ['#0d6efd', '#198754', '#ffc107']
                    }]
                }
            });
        }
    },
    initUserEvents: () => {
         const form = document.getElementById('addUserForm');
         if(form) {
             form.addEventListener('submit', (e) => {
                 e.preventDefault();
                 const newUser = {
                     username: form.username.value,
                     password: form.password.value,
                     name: form.name.value,
                     role: form.role.value
                 };
                 DB.addToTable('users', newUser);
                 App.loadPageContent('users');
                 Swal.fire('Sukses', 'User berhasil ditambahkan', 'success');
             });
         }
         
         document.querySelectorAll('.delete-user-btn').forEach(btn => {
             btn.addEventListener('click', () => {
                 const id = btn.dataset.id;
                 if(confirm('Hapus user ini?')) {
                     DB.deleteFromTable('users', id);
                     App.loadPageContent('users');
                 }
             });
         });
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const user = DB.getTable('users').find(u => u.id == id);
                if (!user) return;
                 const { value: formValues } = await Swal.fire({
                     title: 'Edit User',
                     html:
                         `<input id="sw_username" type="text" class="form-control mb-2" value="${user.username}">` +
                         `<input id="sw_name" type="text" class="form-control mb-2" value="${user.name}">` +
                         `<select id="sw_role" class="form-select mb-2">
                             <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
                             <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                          </select>` +
                         `<input id="sw_password" type="password" class="form-control mb-2" placeholder="Ganti password (opsional)">`,
                     focusConfirm: false,
                     showCancelButton: true,
                     preConfirm: () => {
                         const payload = {
                             username: document.getElementById('sw_username').value,
                             name: document.getElementById('sw_name').value,
                             role: document.getElementById('sw_role').value
                         };
                         const pwd = document.getElementById('sw_password').value;
                         if (pwd) payload.password = pwd;
                         return payload;
                     }
                 });
                if (formValues) {
                    DB.updateInTable('users', id, formValues);
                    App.loadPageContent('users');
                }
            });
        });
        const usersCsvBtn = document.getElementById('downloadUsersCSV');
        if (usersCsvBtn) {
            usersCsvBtn.addEventListener('click', () => {
                const rows = DB.getTable('users');
                const headers = ['Username','Nama Lengkap','Role'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.username),
                        escape(r.name),
                        escape(r.role)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    },
    initPengobatanEvents: () => {
        const form = document.getElementById('addPengobatanForm');
        if(form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    tanggal: form.tanggal.value,
                    kecamatan: form.kecamatan.value,
                    desa: form.desa.value,
                    pemilik: form.pemilik.value,
                    hewan: form.hewan.value,
                    jumlah: parseInt(form.jumlah.value),
                    diagnosa: form.diagnosa.value,
                    terapi: form.terapi.value
                };
                DB.addToTable('pengobatan', data);
                App.loadPageContent('pengobatan');
                Swal.fire('Sukses', 'Data tersimpan', 'success');
            });
        }
        const csvBtn = document.getElementById('downloadPengobatanCSV');
        if (csvBtn) {
            csvBtn.addEventListener('click', () => {
                const rows = DB.getTable('pengobatan');
                const headers = ['Tanggal','Kecamatan','Desa','Pemilik','Hewan','Jumlah','Diagnosa','Terapi'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.tanggal),
                        escape(r.kecamatan),
                        escape(r.desa),
                        escape(r.pemilik),
                        escape(r.hewan),
                        escape(r.jumlah),
                        escape(r.diagnosa),
                        escape(r.terapi)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pengobatan_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
        document.querySelectorAll('.edit-pengobatan-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const item = DB.getTable('pengobatan').find(i => i.id == id);
                if (!item) return;
                const { value: formValues } = await Swal.fire({
                    title: 'Edit Pengobatan',
                    html:
                        `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${item.tanggal}">` +
                        `<input id="sw_kecamatan" type="text" class="form-control mb-2" value="${item.kecamatan}">` +
                        `<input id="sw_desa" type="text" class="form-control mb-2" value="${item.desa}">` +
                        `<input id="sw_pemilik" type="text" class="form-control mb-2" value="${item.pemilik}">` +
                        `<input id="sw_hewan" type="text" class="form-control mb-2" value="${item.hewan}">` +
                        `<textarea id="sw_diagnosa" class="form-control mb-2">${item.diagnosa}</textarea>` +
                        `<textarea id="sw_terapi" class="form-control mb-2">${item.terapi}</textarea>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            pemilik: document.getElementById('sw_pemilik').value,
                            hewan: document.getElementById('sw_hewan').value,
                            diagnosa: document.getElementById('sw_diagnosa').value,
                            terapi: document.getElementById('sw_terapi').value
                        };
                    }
                });
                if (formValues) {
                    DB.updateInTable('pengobatan', id, formValues);
                    App.loadPageContent('pengobatan');
                }
            });
        });
        document.querySelectorAll('.delete-pengobatan-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const ok = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromTable('pengobatan', id);
                    App.loadPageContent('pengobatan');
                }
            });
        });
    },
    initVaksinasiEvents: () => {
        ['pmk', 'rabies', 'lsd'].forEach(type => {
            const form = document.getElementById(`add${type.toUpperCase()}Form`);
            if(form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const data = {
                        tanggal: form.tanggal.value,
                        kecamatan: form.kecamatan.value,
                        desa: form.desa.value,
                        jumlah: form.jumlah.value,
                        keterangan: form.keterangan.value
                    };
                    DB.addToNested('vaksinasi', type, data);
                    App.loadPageContent('vaksinasi');
                    Swal.fire('Sukses', `Data ${type.toUpperCase()} tersimpan`, 'success');
                });
            }
        });
        document.querySelectorAll('.edit-vaksinasi-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const item = DB.getNested('vaksinasi', type).find(i => i.id == id);
                if (!item) return;
                const { value: formValues } = await Swal.fire({
                    title: `Edit Vaksinasi ${type.toUpperCase()}`,
                    html:
                        `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${item.tanggal}">` +
                        `<input id="sw_kecamatan" type="text" class="form-control mb-2" value="${item.kecamatan}">` +
                        `<input id="sw_desa" type="text" class="form-control mb-2" value="${item.desa}">` +
                        `<input id="sw_jumlah" type="number" class="form-control mb-2" value="${item.jumlah}">` +
                        `<textarea id="sw_ket" class="form-control mb-2">${item.keterangan || ''}</textarea>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            jumlah: document.getElementById('sw_jumlah').value,
                            keterangan: document.getElementById('sw_ket').value
                        };
                    }
                });
                if (formValues) {
                    DB.updateNested('vaksinasi', type, id, formValues);
                    App.loadPageContent('vaksinasi');
                }
            });
        });
        document.querySelectorAll('.delete-vaksinasi-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const ok = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromNested('vaksinasi', type, id);
                    App.loadPageContent('vaksinasi');
                }
            });
        });
        document.querySelectorAll('.download-vaksinasi-csv-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const rows = DB.getNested('vaksinasi', type);
                const headers = ['Tanggal','Kecamatan','Desa','Jumlah','Keterangan'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.tanggal),
                        escape(r.kecamatan),
                        escape(r.desa),
                        escape(r.jumlah),
                        escape(r.keterangan)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vaksinasi_${type}_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });
    },
    initMonitoringEvents: () => {
        ['poktan', 'bumdes'].forEach(type => {
            const form = document.getElementById(`add${type}Form`);
            if(form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const data = {
                        nama: form.nama.value,
                        kecamatan: form.kecamatan.value,
                        desa: form.desa.value,
                        keterangan: form.keterangan.value
                    };
                    DB.addToNested('monitoring', type, data);
                    App.loadPageContent('monitoring');
                    Swal.fire('Sukses', `Data ${type.toUpperCase()} tersimpan`, 'success');
                });
            }
        });
        document.querySelectorAll('.edit-monitoring-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const item = DB.getNested('monitoring', type).find(i => i.id == id);
                if (!item) return;
                const { value: formValues } = await Swal.fire({
                    title: `Edit ${type.toUpperCase()}`,
                    html:
                        `<input id="sw_nama" type="text" class="form-control mb-2" value="${item.nama}">` +
                        `<input id="sw_kecamatan" type="text" class="form-control mb-2" value="${item.kecamatan}">` +
                        `<input id="sw_desa" type="text" class="form-control mb-2" value="${item.desa}">` +
                        `<textarea id="sw_ket" class="form-control mb-2">${item.keterangan || ''}</textarea>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            nama: document.getElementById('sw_nama').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            keterangan: document.getElementById('sw_ket').value
                        };
                    }
                });
                if (formValues) {
                    DB.updateNested('monitoring', type, id, formValues);
                    App.loadPageContent('monitoring');
                }
            });
        });
        document.querySelectorAll('.delete-monitoring-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const ok = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromNested('monitoring', type, id);
                    App.loadPageContent('monitoring');
                }
            });
        });
        document.querySelectorAll('.download-monitoring-csv-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const rows = DB.getNested('monitoring', type);
                const headers = ['Nama','Kecamatan','Desa','Keterangan'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.nama),
                        escape(r.kecamatan),
                        escape(r.desa),
                        escape(r.keterangan)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `monitoring_${type}_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });
    },
    initSurveilansEvents: () => {
        const form = document.getElementById('addSurveilansForm');
        if(form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    tanggal: form.tanggal.value,
                    kecamatan: form.kecamatan.value,
                    desa: form.desa.value,
                    jenis_penyakit: form.jenis_penyakit.value,
                    sampel: form.sampel.value,
                    hasil: form.hasil.value
                };
                DB.addToTable('surveilans', data);
                App.loadPageContent('surveilans');
                Swal.fire('Sukses', 'Data surveilans tersimpan', 'success');
            });
        }
        document.querySelectorAll('.edit-surveilans-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const item = DB.getTable('surveilans').find(i => i.id == id);
                if (!item) return;
                const { value: formValues } = await Swal.fire({
                    title: 'Edit Surveilans',
                    html:
                        `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${item.tanggal}">` +
                        `<input id="sw_kecamatan" type="text" class="form-control mb-2" value="${item.kecamatan}">` +
                        `<input id="sw_desa" type="text" class="form-control mb-2" value="${item.desa}">` +
                        `<input id="sw_penyakit" type="text" class="form-control mb-2" value="${item.jenis_penyakit}">` +
                        `<input id="sw_sampel" type="text" class="form-control mb-2" value="${item.sampel}">` +
                        `<input id="sw_hasil" type="text" class="form-control mb-2" value="${item.hasil}">`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            jenis_penyakit: document.getElementById('sw_penyakit').value,
                            sampel: document.getElementById('sw_sampel').value,
                            hasil: document.getElementById('sw_hasil').value
                        };
                    }
                });
                if (formValues) {
                    DB.updateInTable('surveilans', id, formValues);
                    App.loadPageContent('surveilans');
                }
            });
        });
        document.querySelectorAll('.delete-surveilans-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const ok = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromTable('surveilans', id);
                    App.loadPageContent('surveilans');
                }
            });
        });
        const survCsvBtn = document.getElementById('downloadSurveilansCSV');
        if (survCsvBtn) {
            survCsvBtn.addEventListener('click', () => {
                const rows = DB.getTable('surveilans');
                const headers = ['Tanggal','Kecamatan','Desa','Jenis Penyakit','Jenis Sampel','Hasil'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.tanggal),
                        escape(r.kecamatan),
                        escape(r.desa),
                        escape(r.jenis_penyakit),
                        escape(r.sampel),
                        escape(r.hasil)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `surveilans_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    },
    initSuratEvents: () => {
        ['masuk', 'keluar', 'keterangan'].forEach(type => {
            const form = document.getElementById(`addSurat${type}Form`);
            if(form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const data = {
                        nomor: form.nomor.value,
                        tanggal: form.tanggal.value,
                        perihal: form.perihal.value,
                        tujuan: form.tujuan ? form.tujuan.value : '', // tujuan only for keluar
                        pengirim: form.pengirim ? form.pengirim.value : '' // pengirim only for masuk
                    };
                    // Simple normalization for fields
                    if(form.keterangan) data.keterangan = form.keterangan.value;

                    DB.addToNested('surat', type, data);
                    App.loadPageContent('surat');
                    Swal.fire('Sukses', `Surat ${type} tersimpan`, 'success');
                });
            }
        });
        document.querySelectorAll('.edit-surat-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const item = DB.getNested('surat', type).find(i => i.id == id);
                if (!item) return;
                let html = `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${item.tanggal}">` +
                           `<input id="sw_nomor" type="text" class="form-control mb-2" value="${item.nomor}">` +
                           `<input id="sw_perihal" type="text" class="form-control mb-2" value="${item.perihal}">`;
                if (type === 'masuk') {
                    html += `<input id="sw_pengirim" type="text" class="form-control mb-2" value="${item.pengirim || ''}">`;
                }
                if (type === 'keluar') {
                    html += `<input id="sw_tujuan" type="text" class="form-control mb-2" value="${item.tujuan || ''}">`;
                }
                if (type === 'keterangan') {
                    html += `<textarea id="sw_ket" class="form-control mb-2">${item.keterangan || ''}</textarea>`;
                }
                const { value: formValues } = await Swal.fire({
                    title: `Edit Surat ${type}`,
                    html,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        const payload = {
                            tanggal: document.getElementById('sw_tanggal').value,
                            nomor: document.getElementById('sw_nomor').value,
                            perihal: document.getElementById('sw_perihal').value
                        };
                        if (type === 'masuk') payload.pengirim = document.getElementById('sw_pengirim').value;
                        if (type === 'keluar') payload.tujuan = document.getElementById('sw_tujuan').value;
                        if (type === 'keterangan') payload.keterangan = document.getElementById('sw_ket').value;
                        return payload;
                    }
                });
                if (formValues) {
                    DB.updateNested('surat', type, id, formValues);
                    App.loadPageContent('surat');
                }
            });
        });
        document.querySelectorAll('.delete-surat-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const ok = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromNested('surat', type, id);
                    App.loadPageContent('surat');
                }
            });
        });
        document.querySelectorAll('.download-surat-csv-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const rows = DB.getNested('surat', type);
                let headers = [];
                if (type === 'masuk') headers = ['Tanggal','No. Surat','Pengirim','Perihal'];
                else if (type === 'keluar') headers = ['Tanggal','No. Surat','Tujuan','Perihal'];
                else headers = ['Tanggal','No. Surat','Perihal','Keterangan'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => {
                        if (type === 'masuk') return [escape(r.tanggal), escape(r.nomor), escape(r.pengirim), escape(r.perihal)].join(',');
                        if (type === 'keluar') return [escape(r.tanggal), escape(r.nomor), escape(r.tujuan), escape(r.perihal)].join(',');
                        return [escape(r.tanggal), escape(r.nomor), escape(r.perihal), escape(r.keterangan)].join(',');
                    })
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `surat_${type}_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });
    },
    initStokEvents: () => {
        const form = document.getElementById('addStokForm');
        if(form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    nama: form.nama.value,
                    stok: parseInt(form.stok.value),
                    satuan: form.satuan.value
                };
                DB.addToTable('stok_obat', data);
                App.loadPageContent('stok');
                Swal.fire('Sukses', 'Stok obat ditambahkan', 'success');
            });
        }

        const pemakaianForm = document.getElementById('addPemakaianForm');
        if (pemakaianForm) {
            // Auto-fill satuan
            const obatSelect = document.getElementById('pemakaian_obat_id');
            const satuanInput = document.getElementById('pemakaian_satuan');
            
            obatSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                if (selectedOption) {
                    satuanInput.value = selectedOption.dataset.satuan || '';
                } else {
                    satuanInput.value = '';
                }
            });

            pemakaianForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const obatId = parseInt(pemakaianForm.obat_id.value);
                const jumlah = parseInt(pemakaianForm.jumlah.value);
                
                // Validate Stock
                const stokObat = DB.getTable('stok_obat').find(o => o.id === obatId);
                if (!stokObat) return;

                if (stokObat.stok < jumlah) {
                    Swal.fire('Error', `Stok tidak mencukupi! Sisa stok: ${stokObat.stok}`, 'error');
                    return;
                }

                // Reduce Stock
                DB.updateInTable('stok_obat', obatId, { stok: stokObat.stok - jumlah });

                // Save Pemakaian Record
                const data = {
                    tanggal: pemakaianForm.tanggal.value,
                    obat_id: obatId,
                    nama_obat: stokObat.nama,
                    jumlah: jumlah,
                    satuan: stokObat.satuan
                };
                DB.addToTable('pemakaian_obat', data);

                App.loadPageContent('stok');
                // Switch back to Pemakaian tab
                setTimeout(() => {
                    const triggerEl = document.querySelector('#stokTabs button[data-bs-target="#pemakaian-content"]');
                    if(triggerEl) {
                        const tab = new bootstrap.Tab(triggerEl);
                        tab.show();
                    }
                }, 100);

                Swal.fire('Sukses', 'Pemakaian obat tercatat', 'success');
            });
        }
        
        // Update stock buttons
        document.querySelectorAll('.update-stock-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const currentStok = parseInt(btn.dataset.stok);
                
                const { value: newStok } = await Swal.fire({
                    title: 'Update Jumlah Stok',
                    input: 'number',
                    inputValue: currentStok,
                    showCancelButton: true
                });

                if (newStok) {
                    DB.updateInTable('stok_obat', id, { stok: parseInt(newStok) });
                    App.loadPageContent('stok');
                }
            });
        });
        document.querySelectorAll('.edit-obat-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const nama = btn.dataset.nama;
                const satuan = btn.dataset.satuan;
                const { value: formValues } = await Swal.fire({
                    title: 'Edit Obat',
                    html:
                        `<input id="sw_nama" type="text" class="form-control mb-2" value="${nama}">` +
                        `<input id="sw_satuan" type="text" class="form-control mb-2" value="${satuan}">`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            nama: document.getElementById('sw_nama').value,
                            satuan: document.getElementById('sw_satuan').value
                        };
                    }
                });
                if (formValues) {
                    DB.updateInTable('stok_obat', id, formValues);
                    App.loadPageContent('stok');
                }
            });
        });
        document.querySelectorAll('.delete-stock-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const ok = await Swal.fire({ title: 'Hapus obat?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromTable('stok_obat', id);
                    App.loadPageContent('stok');
                }
            });
        });
        document.querySelectorAll('.edit-pemakaian-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const pemakaian = DB.getTable('pemakaian_obat').find(p => p.id == id);
                if (!pemakaian) return;
                const stok = DB.getTable('stok_obat');
                const options = stok.map(o => `<option value="${o.id}" ${o.id == pemakaian.obat_id ? 'selected' : ''} data-satuan="${o.satuan}">${o.nama} (Sisa: ${o.stok} ${o.satuan})</option>`).join('');
                const { value: formValues } = await Swal.fire({
                    title: 'Edit Pemakaian Obat',
                    html:
                        `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${pemakaian.tanggal}">` +
                        `<select id="sw_obat" class="form-select mb-2">${options}</select>` +
                        `<input id="sw_jumlah" type="number" class="form-control mb-2" value="${pemakaian.jumlah}">`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        const sel = document.getElementById('sw_obat');
                        const opt = sel.selectedOptions[0];
                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            obat_id: parseInt(sel.value),
                            nama_obat: opt.text.split(' (Sisa:')[0],
                            satuan: opt.dataset.satuan,
                            jumlah: parseInt(document.getElementById('sw_jumlah').value)
                        };
                    }
                });
                if (formValues) {
                    const oldObat = DB.getTable('stok_obat').find(o => o.id == pemakaian.obat_id);
                    if (oldObat) DB.updateInTable('stok_obat', oldObat.id, { stok: oldObat.stok + pemakaian.jumlah });
                    const newObat = DB.getTable('stok_obat').find(o => o.id == formValues.obat_id);
                    if (!newObat || newObat.stok < formValues.jumlah) {
                        Swal.fire('Error', 'Stok tidak mencukupi untuk perubahan', 'error');
                        return;
                    }
                    DB.updateInTable('stok_obat', newObat.id, { stok: newObat.stok - formValues.jumlah });
                    DB.updateInTable('pemakaian_obat', id, formValues);
                    App.loadPageContent('stok');
                    setTimeout(() => {
                        const triggerEl = document.querySelector('#stokTabs button[data-bs-target="#pemakaian-content"]');
                        if(triggerEl) {
                            const tab = new bootstrap.Tab(triggerEl);
                            tab.show();
                        }
                    }, 100);
                }
            });
        });
        document.querySelectorAll('.delete-pemakaian-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const pemakaian = DB.getTable('pemakaian_obat').find(p => p.id == id);
                if (!pemakaian) return;
                const ok = await Swal.fire({ title: 'Hapus pemakaian?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    const obat = DB.getTable('stok_obat').find(o => o.id == pemakaian.obat_id);
                    if (obat) DB.updateInTable('stok_obat', obat.id, { stok: obat.stok + pemakaian.jumlah });
                    DB.deleteFromTable('pemakaian_obat', id);
                    App.loadPageContent('stok');
                    setTimeout(() => {
                        const triggerEl = document.querySelector('#stokTabs button[data-bs-target="#pemakaian-content"]');
                        if(triggerEl) {
                            const tab = new bootstrap.Tab(triggerEl);
                            tab.show();
                        }
                    }, 100);
                }
            });
        });
        const stokCsvBtn = document.getElementById('downloadStokCSV');
        if (stokCsvBtn) {
            stokCsvBtn.addEventListener('click', () => {
                const rows = DB.getTable('stok_obat');
                const headers = ['Nama Obat','Stok','Satuan'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.nama),
                        escape(r.stok),
                        escape(r.satuan)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `stok_obat_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
        const pemakaianCsvBtn = document.getElementById('downloadPemakaianCSV');
        if (pemakaianCsvBtn) {
            pemakaianCsvBtn.addEventListener('click', () => {
                const rows = DB.getTable('pemakaian_obat');
                const headers = ['Tanggal','Nama Obat','Jumlah Keluar','Satuan'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.tanggal),
                        escape(r.nama_obat),
                        escape(r.jumlah),
                        escape(r.satuan)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pemakaian_obat_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    },

    initKegiatanLainEvents: () => {
        const form = document.getElementById('addKegiatanLainForm');
        if(form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    tanggal: form.tanggal.value,
                    nama_kegiatan: form.nama_kegiatan.value,
                    petugas: form.petugas.value,
                    keterangan: form.keterangan.value
                };
                DB.addToTable('kegiatan_lain', data);
                App.loadPageContent('kegiatan_lain');
                Swal.fire('Sukses', 'Kegiatan berhasil disimpan', 'success');
            });
        }
        document.querySelectorAll('.edit-kegiatan-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const item = DB.getTable('kegiatan_lain').find(i => i.id == id);
                if (!item) return;
                const { value: formValues } = await Swal.fire({
                    title: 'Edit Kegiatan',
                    html:
                        `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${item.tanggal}">` +
                        `<input id="sw_nama" type="text" class="form-control mb-2" value="${item.nama_kegiatan}">` +
                        `<input id="sw_petugas" type="text" class="form-control mb-2" value="${item.petugas}">` +
                        `<textarea id="sw_ket" class="form-control mb-2">${item.keterangan || ''}</textarea>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            nama_kegiatan: document.getElementById('sw_nama').value,
                            petugas: document.getElementById('sw_petugas').value,
                            keterangan: document.getElementById('sw_ket').value
                        };
                    }
                });
                if (formValues) {
                    DB.updateInTable('kegiatan_lain', id, formValues);
                    App.loadPageContent('kegiatan_lain');
                }
            });
        });
        document.querySelectorAll('.delete-kegiatan-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const ok = await Swal.fire({ title: 'Hapus kegiatan?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromTable('kegiatan_lain', id);
                    App.loadPageContent('kegiatan_lain');
                }
            });
        });
        const kegCsvBtn = document.getElementById('downloadKegiatanLainCSV');
        if (kegCsvBtn) {
            kegCsvBtn.addEventListener('click', () => {
                const rows = DB.getTable('kegiatan_lain');
                const headers = ['Tanggal','Nama Kegiatan/Rapat/Pelatihan','Petugas Pelaksana','Keterangan'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.tanggal),
                        escape(r.nama_kegiatan),
                        escape(r.petugas),
                        escape(r.keterangan)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kegiatan_lain_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    },

    initKunjunganTamuEvents: () => {
        const form = document.getElementById('addKunjunganTamuForm');
        if(form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    tanggal: form.tanggal.value,
                    nama: form.nama.value,
                    alamat: form.alamat.value,
                    no_hp: form.no_hp.value,
                    tujuan: form.tujuan.value
                };
                DB.addToTable('kunjungan_tamu', data);
                App.loadPageContent('kunjungan_tamu');
                Swal.fire('Sukses', 'Data kunjungan tamu berhasil disimpan', 'success');
            });
        }
        document.querySelectorAll('.edit-kunjungan-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const item = DB.getTable('kunjungan_tamu').find(i => i.id == id);
                if (!item) return;
                const { value: formValues } = await Swal.fire({
                    title: 'Edit Kunjungan Tamu',
                    html:
                        `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${item.tanggal}">` +
                        `<input id="sw_nama" type="text" class="form-control mb-2" value="${item.nama || ''}">` +
                        `<input id="sw_alamat" type="text" class="form-control mb-2" value="${item.alamat}">` +
                        `<input id="sw_nohp" type="text" class="form-control mb-2" value="${item.no_hp}">` +
                        `<textarea id="sw_tujuan" class="form-control mb-2">${item.tujuan || ''}</textarea>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            nama: document.getElementById('sw_nama').value,
                            alamat: document.getElementById('sw_alamat').value,
                            no_hp: document.getElementById('sw_nohp').value,
                            tujuan: document.getElementById('sw_tujuan').value
                        };
                    }
                });
                if (formValues) {
                    DB.updateInTable('kunjungan_tamu', id, formValues);
                    App.loadPageContent('kunjungan_tamu');
                }
            });
        });
        document.querySelectorAll('.delete-kunjungan-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const ok = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromTable('kunjungan_tamu', id);
                    App.loadPageContent('kunjungan_tamu');
                }
            });
        });
        const ktCsvBtn = document.getElementById('downloadKunjunganTamuCSV');
        if (ktCsvBtn) {
            ktCsvBtn.addEventListener('click', () => {
                const rows = DB.getTable('kunjungan_tamu');
                const headers = ['Tanggal','Nama','Alamat','No HP','Tujuan'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.tanggal),
                        escape(r.nama),
                        escape(r.alamat),
                        escape(r.no_hp),
                        escape(r.tujuan)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kunjungan_tamu_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    }
};

const Views = {
    login: () => `
        <div class="d-flex justify-content-center align-items-center vh-100 bg-primary">
            <div class="card login-container shadow-lg">
                <div class="card-body">
                    <div class="d-flex justify-content-center align-items-center mb-3">
                        <img src="assets/logo-kab-sukabumi.png" alt="Logo Kabupaten Sukabumi" style="height:64px; width:auto; object-fit:contain; margin-right:12px;" onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/id/6/6f/Lambang_Kab_Sukabumi.svg'">
                        <img src="assets/logo-puskeswan.png" alt="Logo Puskeswan" style="height:64px; width:auto; object-fit:contain;" onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/3/31/Veterinary_Caduceus.svg'">
                    </div>
                    <h3 class="text-center mb-4">Login myPuskeswan Sukalarang</h3>
                    <form id="loginForm">
                        <div class="mb-3">
                            <label class="form-label">Username</label>
                            <input type="text" name="username" class="form-control" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <input type="password" name="password" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Login</button>
                    </form>
                </div>
            </div>
        </div>
    `,

    layout: (activeRoute) => `
        <div class="d-flex">
            <!-- Sidebar -->
            <div class="bg-white sidebar p-3 sticky-top" style="width: 250px; height: 100vh; overflow-y: auto;">
                <h4 class="text-primary mb-4 ps-2">myPuskeswan Sukalarang</h4>
                <div class="nav flex-column nav-pills">
                    <a href="#dashboard" class="nav-link ${activeRoute === 'dashboard' ? 'active' : ''}"><i class="bi bi-speedometer2 me-2"></i> Dashboard</a>
                    <a href="#pengobatan" class="nav-link ${activeRoute === 'pengobatan' ? 'active' : ''}"><i class="bi bi-bandaid me-2"></i> Pengobatan</a>
                    <a href="#vaksinasi" class="nav-link ${activeRoute === 'vaksinasi' ? 'active' : ''}"><i class="bi bi-shield-plus me-2"></i> Vaksinasi</a>
                    <a href="#monitoring" class="nav-link ${activeRoute === 'monitoring' ? 'active' : ''}"><i class="bi bi-eye me-2"></i> Monitoring</a>
                    <a href="#surveilans" class="nav-link ${activeRoute === 'surveilans' ? 'active' : ''}"><i class="bi bi-activity me-2"></i> Surveilans</a>
                    <a href="#surat" class="nav-link ${activeRoute === 'surat' ? 'active' : ''}"><i class="bi bi-envelope me-2"></i> Surat</a>
                    <a href="#stok" class="nav-link ${activeRoute === 'stok' ? 'active' : ''}"><i class="bi bi-box-seam me-2"></i> Stok Obat</a>
                    <a href="#kegiatan_lain" class="nav-link ${activeRoute === 'kegiatan_lain' ? 'active' : ''}"><i class="bi bi-calendar-event me-2"></i> Kegiatan Lain</a>
                    <a href="#kunjungan_tamu" class="nav-link ${activeRoute === 'kunjungan_tamu' ? 'active' : ''}"><i class="bi bi-people-fill me-2"></i> Kunjungan Tamu</a>
                    ${App.state.currentUser.role === 'admin' ?  
                        `<a href="#users" class="nav-link ${activeRoute === 'users' ? 'active' : ''}"><i class="bi bi-people me-2"></i> User</a>` 
                        : ''}
                    <hr>
                    <a href="#" id="logoutBtn" class="nav-link text-danger"><i class="bi bi-box-arrow-right me-2"></i> Logout</a>
                </div>
            </div>

            <!-- Main Content -->
            <div class="flex-grow-1 bg-light" style="height: 100vh; overflow-y: auto;">
                <!-- Print Footer -->
                <div id="print-footer" class="d-none d-print-block print-footer"></div>

                <nav class="navbar navbar-light bg-white shadow-sm mb-4 sticky-top">
                    <div class="container-fluid">
                        <span class="navbar-brand mb-0 h1 ps-3">
                            ${activeRoute.charAt(0).toUpperCase() + activeRoute.slice(1)}
                        </span>
                        <span class="me-3">Halo, <strong>${App.state.currentUser.name}</strong></span>
                    </div>
                </nav>
                <div id="main-content" class="container-fluid px-4 pb-5">
                    <!-- Content injected here -->
                </div>
            </div>
        </div>
    `,

    dashboard: () => {
        const stats = {
            pengobatan: DB.getTable('pengobatan').length,
            vaksinasi_pmk: DB.getNested('vaksinasi', 'pmk').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            vaksinasi_rabies: DB.getNested('vaksinasi', 'rabies').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            vaksinasi_lsd: DB.getNested('vaksinasi', 'lsd').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            monitoring_poktan: DB.getNested('monitoring', 'poktan').length,
            monitoring_bumdes: DB.getNested('monitoring', 'bumdes').length,
            surveilans: DB.getTable('surveilans').length
        };

        const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        return `
            <div class="d-flex justify-content-end mb-3">
                <h5 class="text-secondary"><i class="bi bi-calendar3 me-2"></i>${currentDate}</h5>
            </div>
            <div class="row g-3 mb-4">
                <!-- Row 1: Pengobatan & Vaksinasi -->
                <div class="col-md-3">
                    <div class="card card-dashboard bg-primary text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Total Pengobatan</h5>
                            <h2 class="display-6">${stats.pengobatan} <span class="fs-6">Ekor</span></h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card card-dashboard bg-success text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Vaksinasi PMK</h5>
                            <h2 class="display-6">${stats.vaksinasi_pmk} <span class="fs-6">Ekor</span></h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card card-dashboard bg-success text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Vaksinasi Rabies</h5>
                            <h2 class="display-6">${stats.vaksinasi_rabies} <span class="fs-6">Ekor</span></h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card card-dashboard bg-success text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Vaksinasi LSD</h5>
                            <h2 class="display-6">${stats.vaksinasi_lsd} <span class="fs-6">Ekor</span></h2>
                        </div>
                    </div>
                </div>

                <!-- Row 2: Monitoring & Surveilans -->
                <div class="col-md-4">
                    <div class="card card-dashboard bg-info text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Monitoring Poktan</h5>
                            <h2 class="display-6">${stats.monitoring_poktan} <span class="fs-6">Kali</span></h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card card-dashboard bg-info text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Monitoring BUMDES</h5>
                            <h2 class="display-6">${stats.monitoring_bumdes} <span class="fs-6">Kali</span></h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card card-dashboard bg-warning text-dark h-100">
                        <div class="card-body">
                            <h5 class="card-title">Surveilans</h5>
                            <h2 class="display-6">${stats.surveilans} <span class="fs-6">Kali</span></h2>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <canvas id="serviceChart" style="max-height: 400px;"></canvas>
                </div>
            </div>
        `;
    },

    kunjungan_tamu: () => {
        const data = DB.getTable('kunjungan_tamu');
        const rows = data.map(i => `
            <tr>
                <td>${i.tanggal}</td>
                <td>${i.nama || ''}</td>
                <td>${i.alamat}</td>
                <td>${i.no_hp}</td>
                <td>${i.tujuan}</td>
                <td class="d-print-none">
                    <button class="btn btn-sm btn-warning edit-kunjungan-btn" data-id="${i.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-kunjungan-btn" data-id="${i.id}"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Kunjungan Tamu</h5>
                    <div>
                        <button class="btn btn-secondary btn-sm me-2" onclick="window.print()">
                            <i class="bi bi-printer"></i> Cetak Laporan
                        </button>
                        <button class="btn btn-success btn-sm me-2" id="downloadKunjunganTamuCSV">
                            <i class="bi bi-filetype-csv"></i> Download CSV
                        </button>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addKunjunganTamuModal">
                            <i class="bi bi-plus-lg"></i> Tambah Tamu
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Nama</th>
                                    <th>Alamat</th>
                                    <th>No HP</th>
                                    <th>Tujuan</th>
                                    <th class="d-print-none">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.length ? rows : '<tr><td colspan="6" class="text-center">Belum ada data</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="addKunjunganTamuModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="addKunjunganTamuForm">
                            <div class="modal-header">
                                <h5 class="modal-title">Input Kunjungan Tamu</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3"><label class="form-label">Tanggal</label><input type="date" name="tanggal" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Nama</label><input type="text" name="nama" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Alamat</label><input type="text" name="alamat" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">No HP</label><input type="text" name="no_hp" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Tujuan</label><textarea name="tujuan" class="form-control" rows="3" required></textarea></div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    users: () => {
        const users = DB.getTable('users');
        const rows = users.map(u => `
            <tr>
                <td>${u.username}</td>
                <td>${u.name}</td>
                <td><span class="badge bg-${u.role === 'admin' ? 'danger' : 'secondary'}">${u.role}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning edit-user-btn" data-id="${u.id}" data-username="${u.username}" data-name="${u.name}" data-role="${u.role}"><i class="bi bi-pencil"></i></button>
                    ${u.username !== 'admin' ? 
                        `<button class="btn btn-sm btn-danger delete-user-btn" data-id="${u.id}"><i class="bi bi-trash"></i></button>` 
                        : ''}
                </td>
            </tr>
        `).join('');

        return `
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Daftar Pengguna</h5>
                    <div>
                        <button class="btn btn-success btn-sm me-2" id="downloadUsersCSV">
                            <i class="bi bi-filetype-csv"></i> Download CSV
                        </button>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addUserModal">
                            <i class="bi bi-plus-lg"></i> Tambah User
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Nama Lengkap</th>
                                    <th>Role</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="addUserModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="addUserForm">
                            <div class="modal-header">
                                <h5 class="modal-title">Tambah User Baru</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Username</label>
                                    <input type="text" name="username" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Password</label>
                                    <input type="password" name="password" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Nama Lengkap</label>
                                    <input type="text" name="name" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Role</label>
                                    <select name="role" class="form-select">
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    pengobatan: () => {
        const data = DB.getTable('pengobatan');
        const rows = data.map(item => `
            <tr>
                <td>${item.tanggal}</td>
                <td>${item.kecamatan}</td>
                <td>${item.desa}</td>
                <td>${item.pemilik}</td>
                <td>${item.hewan}</td>
                <td>${item.jumlah ?? ''}</td>
                <td>${item.diagnosa}</td>
                <td>${item.terapi}</td>
                <td class="d-print-none">
                    <button class="btn btn-sm btn-warning edit-pengobatan-btn" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-pengobatan-btn" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Data Pelayanan Pengobatan</h5>
                    <div>
                        <button class="btn btn-secondary btn-sm me-2" onclick="window.print()">
                            <i class="bi bi-printer"></i> Cetak Laporan
                        </button>
                        <button class="btn btn-success btn-sm me-2" id="downloadPengobatanCSV">
                            <i class="bi bi-filetype-csv"></i> Download CSV
                        </button>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addPengobatanModal">
                            <i class="bi bi-plus-lg"></i> Input Data
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Kecamatan</th>
                                    <th>Desa</th>
                                    <th>Pemilik</th>
                                    <th>Hewan</th>
                                    <th>Jumlah (Ekor)</th>
                                    <th>Diagnosa</th>
                                    <th>Terapi</th>
                                    <th class="d-print-none">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.length ? rows : '<tr><td colspan="9" class="text-center">Belum ada data</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="addPengobatanModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="addPengobatanForm">
                            <div class="modal-header">
                                <h5 class="modal-title">Input Pengobatan</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Tanggal</label>
                                    <input type="date" name="tanggal" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Kecamatan</label>
                                    <input type="text" name="kecamatan" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Desa</label>
                                    <input type="text" name="desa" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Pemilik</label>
                                    <input type="text" name="pemilik" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Hewan</label>
                                    <input type="text" name="hewan" class="form-control" required placeholder="Sapi, Kambing, Kucing...">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Jumlah (Ekor)</label>
                                    <input type="number" name="jumlah" class="form-control" required min="1">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Diagnosa</label>
                                    <textarea name="diagnosa" class="form-control" required></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Terapi/Tindakan</label>
                                    <textarea name="terapi" class="form-control" required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    vaksinasi: () => {
        const renderTable = (type) => {
            const data = DB.getNested('vaksinasi', type);
            const rows = data.map(item => `
                <tr>
                    <td>${item.tanggal}</td>
                    <td>${item.kecamatan}</td>
                    <td>${item.desa}</td>
                    <td>${item.jumlah}</td>
                    <td>${item.keterangan}</td>
                    <td class="d-print-none">
                        <button class="btn btn-sm btn-warning edit-vaksinasi-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-danger delete-vaksinasi-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `).join('');
            return `
                <div class="table-responsive mt-3">
                    <table class="table table-bordered">
                        <thead><tr><th>Tanggal</th><th>Kecamatan</th><th>Desa</th><th>Jumlah (Ekor)</th><th>Ket</th><th class="d-print-none">Aksi</th></tr></thead>
                        <tbody>${rows.length ? rows : '<tr><td colspan="6" class="text-center">Belum ada data</td></tr>'}</tbody>
                    </table>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <button class="btn btn-secondary btn-sm" onclick="window.print()">
                        <i class="bi bi-printer"></i> Cetak Laporan ${type.toUpperCase()}
                    </button>
                    <div>
                        <button class="btn btn-success btn-sm me-2 download-vaksinasi-csv-btn" data-type="${type}">
                            <i class="bi bi-filetype-csv"></i> Download CSV ${type.toUpperCase()}
                        </button>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#add${type.toUpperCase()}Modal">
                            <i class="bi bi-plus-lg"></i> Tambah Data ${type.toUpperCase()}
                        </button>
                    </div>
                </div>
                
                <div class="modal fade" id="add${type.toUpperCase()}Modal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <form id="add${type.toUpperCase()}Form">
                                <div class="modal-header">
                                    <h5 class="modal-title">Input Vaksinasi ${type.toUpperCase()}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3"><label class="form-label">Tanggal</label><input type="date" name="tanggal" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Kecamatan</label><input type="text" name="kecamatan" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Desa</label><input type="text" name="desa" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Jumlah (Ekor)</label><input type="number" name="jumlah" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Keterangan</label><textarea name="keterangan" class="form-control"></textarea></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        };

        return `
            <div class="card">
                <div class="card-header">
                    <ul class="nav nav-tabs card-header-tabs" id="vaksinTab" role="tablist">
                        <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#pmk">PMK</a></li>
                        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#rabies">Rabies</a></li>
                        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#lsd">LSD</a></li>
                    </ul>
                </div>
                <div class="card-body">
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="pmk">${renderTable('pmk')}</div>
                        <div class="tab-pane fade" id="rabies">${renderTable('rabies')}</div>
                        <div class="tab-pane fade" id="lsd">${renderTable('lsd')}</div>
                    </div>
                </div>
            </div>
        `;
    },

    monitoring: () => {
        const renderTable = (type) => {
            const data = DB.getNested('monitoring', type);
            const rows = data.map(item => `
                <tr>
                    <td>${item.nama}</td>
                    <td>${item.kecamatan}</td>
                    <td>${item.desa}</td>
                    <td>${item.keterangan}</td>
                    <td class="d-print-none">
                        <button class="btn btn-sm btn-warning edit-monitoring-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-danger delete-monitoring-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `).join('');
            return `
                <div class="table-responsive mt-3">
                    <table class="table table-bordered">
                        <thead><tr><th>Nama Kelompok/Bumdes</th><th>Kecamatan</th><th>Desa</th><th>Keterangan</th><th class="d-print-none">Aksi</th></tr></thead>
                        <tbody>${rows.length ? rows : '<tr><td colspan="5" class="text-center">Belum ada data</td></tr>'}</tbody>
                    </table>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <button class="btn btn-secondary btn-sm" onclick="window.print()">
                        <i class="bi bi-printer"></i> Cetak Laporan
                    </button>
                    <div>
                        <button class="btn btn-success btn-sm me-2 download-monitoring-csv-btn" data-type="${type}">
                            <i class="bi bi-filetype-csv"></i> Download CSV
                        </button>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#add${type}Modal">
                            <i class="bi bi-plus-lg"></i> Tambah Data
                        </button>
                    </div>
                </div>

                <div class="modal fade" id="add${type}Modal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <form id="add${type}Form">
                                <div class="modal-header">
                                    <h5 class="modal-title">Input ${type.toUpperCase()}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3"><label class="form-label">Nama</label><input type="text" name="nama" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Kecamatan</label><input type="text" name="kecamatan" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Desa</label><input type="text" name="desa" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Keterangan</label><textarea name="keterangan" class="form-control"></textarea></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        };

        return `
            <div class="card">
                <div class="card-header">
                    <ul class="nav nav-tabs card-header-tabs">
                        <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#poktan">Kelompok Tani</a></li>
                        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#bumdes">BUMDES</a></li>
                    </ul>
                </div>
                <div class="card-body">
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="poktan">${renderTable('poktan')}</div>
                        <div class="tab-pane fade" id="bumdes">${renderTable('bumdes')}</div>
                    </div>
                </div>
            </div>
        `;
    },

    surveilans: () => {
        const data = DB.getTable('surveilans');
        const rows = data.map(item => `
            <tr>
                <td>${item.tanggal}</td>
                <td>${item.kecamatan}</td>
                <td>${item.desa}</td>
                <td>${item.jenis_penyakit}</td>
                <td>${item.sampel}</td>
                <td>${item.hasil}</td>
                <td class="d-print-none">
                    <button class="btn btn-sm btn-warning edit-surveilans-btn" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-surveilans-btn" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Surveilans PHMS</h5>
                    <div>
                        <button class="btn btn-secondary btn-sm me-2" onclick="window.print()">
                            <i class="bi bi-printer"></i> Cetak Laporan
                        </button>
                        <button class="btn btn-success btn-sm me-2" id="downloadSurveilansCSV">
                            <i class="bi bi-filetype-csv"></i> Download CSV
                        </button>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addSurveilansModal">
                            <i class="bi bi-plus-lg"></i> Input Data
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Kecamatan</th>
                                    <th>Desa</th>
                                    <th>Jenis Penyakit</th>
                                    <th>Jenis Sampel</th>
                                    <th>Hasil</th>
                                    <th class="d-print-none">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.length ? rows : '<tr><td colspan="7" class="text-center">Belum ada data</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="addSurveilansModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="addSurveilansForm">
                            <div class="modal-header">
                                <h5 class="modal-title">Input Surveilans</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3"><label class="form-label">Tanggal</label><input type="date" name="tanggal" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Kecamatan</label><input type="text" name="kecamatan" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Desa</label><input type="text" name="desa" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Jenis Penyakit</label><input type="text" name="jenis_penyakit" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Jenis Sampel</label><input type="text" name="sampel" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Hasil</label><input type="text" name="hasil" class="form-control" required></div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    surat: () => {
        const renderTable = (type) => {
            const data = DB.getNested('surat', type);
            // Different columns based on type
            let headers = '';
            let rows = '';
            
            if (type === 'masuk') {
                headers = '<th>Tanggal</th><th>No. Surat</th><th>Pengirim</th><th>Perihal</th><th class="d-print-none">Aksi</th>';
                rows = data.map(i => `<tr><td>${i.tanggal}</td><td>${i.nomor}</td><td>${i.pengirim}</td><td>${i.perihal}</td><td class="d-print-none"><button class="btn btn-sm btn-warning edit-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-danger delete-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-trash"></i></button></td></tr>`).join('');
            } else if (type === 'keluar') {
                headers = '<th>Tanggal</th><th>No. Surat</th><th>Tujuan</th><th>Perihal</th><th class="d-print-none">Aksi</th>';
                rows = data.map(i => `<tr><td>${i.tanggal}</td><td>${i.nomor}</td><td>${i.tujuan}</td><td>${i.perihal}</td><td class="d-print-none"><button class="btn btn-sm btn-warning edit-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-danger delete-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-trash"></i></button></td></tr>`).join('');
            } else {
                headers = '<th>Tanggal</th><th>No. Surat</th><th>Perihal</th><th>Keterangan</th><th class="d-print-none">Aksi</th>';
                rows = data.map(i => `<tr><td>${i.tanggal}</td><td>${i.nomor}</td><td>${i.perihal}</td><td>${i.keterangan}</td><td class="d-print-none"><button class="btn btn-sm btn-warning edit-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-danger delete-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-trash"></i></button></td></tr>`).join('');
            }

            return `
                <div class="table-responsive mt-3">
                    <table class="table table-bordered">
                        <thead><tr>${headers}</tr></thead>
                        <tbody>${rows.length ? rows : `<tr><td colspan="5" class="text-center">Belum ada data</td></tr>`}</tbody>
                    </table>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <button class="btn btn-secondary btn-sm" onclick="window.print()">
                        <i class="bi bi-printer"></i> Cetak Laporan
                    </button>
                    <div>
                        <button class="btn btn-success btn-sm me-2 download-surat-csv-btn" data-type="${type}">
                            <i class="bi bi-filetype-csv"></i> Download CSV
                        </button>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addSurat${type}Modal">
                            <i class="bi bi-plus-lg"></i> Tambah Surat ${type}
                        </button>
                    </div>
                </div>

                <div class="modal fade" id="addSurat${type}Modal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <form id="addSurat${type}Form">
                                <div class="modal-header">
                                    <h5 class="modal-title">Input Surat ${type}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3"><label class="form-label">Tanggal</label><input type="date" name="tanggal" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Nomor Surat</label><input type="text" name="nomor" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Perihal</label><input type="text" name="perihal" class="form-control" required></div>
                                    ${type === 'masuk' ? `<div class="mb-3"><label class="form-label">Pengirim</label><input type="text" name="pengirim" class="form-control" required></div>` : ''}
                                    ${type === 'keluar' ? `<div class="mb-3"><label class="form-label">Tujuan</label><input type="text" name="tujuan" class="form-control" required></div>` : ''}
                                    ${type === 'keterangan' ? `<div class="mb-3"><label class="form-label">Keterangan</label><textarea name="keterangan" class="form-control"></textarea></div>` : ''}
                                </div>
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        };

        return `
            <div class="card">
                <div class="card-header">
                    <ul class="nav nav-tabs card-header-tabs">
                        <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#masuk">Surat Masuk</a></li>
                        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#keluar">Surat Keluar</a></li>
                        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#ket">Surat Keterangan</a></li>
                    </ul>
                </div>
                <div class="card-body">
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="masuk">${renderTable('masuk')}</div>
                        <div class="tab-pane fade" id="keluar">${renderTable('keluar')}</div>
                        <div class="tab-pane fade" id="ket">${renderTable('keterangan')}</div>
                    </div>
                </div>
            </div>
        `;
    },

    stok: () => {
        const stok = DB.getTable('stok_obat');
        const pemakaian = DB.getTable('pemakaian_obat'); // New table

        const stokRows = stok.map(s => `
            <tr>
                <td>${s.nama}</td>
                <td>${s.stok}</td>
                <td>${s.satuan}</td>
                <td class="d-print-none">
                    <button class="btn btn-sm btn-info edit-obat-btn" data-id="${s.id}" data-nama="${s.nama}" data-satuan="${s.satuan}"><i class="bi bi-pencil-square"></i> Edit Obat</button>
                    <button class="btn btn-sm btn-warning update-stock-btn" data-id="${s.id}" data-stok="${s.stok}"><i class="bi bi-pencil"></i> Edit Stok</button>
                    ${App.state.currentUser.role === 'admin' ? 
                        `<button class="btn btn-sm btn-danger delete-stock-btn" data-id="${s.id}"><i class="bi bi-trash"></i></button>` 
                        : ''}
                </td>
            </tr>
        `).join('');

        const pemakaianRows = pemakaian.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal)).map(p => `
            <tr>
                <td>${p.tanggal}</td>
                <td>${p.nama_obat}</td>
                <td>${p.jumlah}</td>
                <td>${p.satuan}</td>
                <td class="d-print-none">
                    <button class="btn btn-sm btn-warning edit-pemakaian-btn" data-id="${p.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-pemakaian-btn" data-id="${p.id}"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');

        const obatOptions = stok.map(o => `<option value="${o.id}" data-satuan="${o.satuan}">${o.nama} (Sisa: ${o.stok} ${o.satuan})</option>`).join('');

        return `
            <ul class="nav nav-tabs mb-3 d-print-none" id="stokTabs" role="tablist">
                <li class="nav-item">
                    <button class="nav-link active" id="stok-tab" data-bs-toggle="tab" data-bs-target="#stok-content" type="button">Stok Obat</button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" id="pemakaian-tab" data-bs-toggle="tab" data-bs-target="#pemakaian-content" type="button">Riwayat Pemakaian</button>
                </li>
            </ul>

            <div class="tab-content">
                <!-- Stok Content -->
                <div class="tab-pane fade show active" id="stok-content">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Stok Obat</h5>
                            <div>
                                <button class="btn btn-secondary btn-sm me-2" onclick="window.print()">
                                    <i class="bi bi-printer"></i> Cetak Laporan
                                </button>
                                <button class="btn btn-success btn-sm me-2" id="downloadStokCSV">
                                    <i class="bi bi-filetype-csv"></i> Download CSV
                                </button>
                                <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addStokModal">
                                    <i class="bi bi-plus-lg"></i> Tambah Obat Baru
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Nama Obat</th>
                                            <th>Stok</th>
                                            <th>Satuan</th>
                                            <th class="d-print-none">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${stokRows.length ? stokRows : '<tr><td colspan="4" class="text-center">Belum ada data</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pemakaian Content -->
                <div class="tab-pane fade" id="pemakaian-content">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Riwayat Pemakaian Obat</h5>
                            <div>
                                <button class="btn btn-success btn-sm me-2" id="downloadPemakaianCSV">
                                    <i class="bi bi-filetype-csv"></i> Download CSV
                                </button>
                                <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addPemakaianModal">
                                    <i class="bi bi-plus-lg"></i> Catat Pemakaian
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Nama Obat</th>
                                            <th>Jumlah Keluar</th>
                                            <th>Satuan</th>
                                            <th class="d-print-none">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pemakaianRows.length ? pemakaianRows : '<tr><td colspan="4" class="text-center">Belum ada data pemakaian</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Tambah Stok -->
            <div class="modal fade" id="addStokModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="addStokForm">
                            <div class="modal-header">
                                <h5 class="modal-title">Tambah Obat Baru</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3"><label class="form-label">Nama Obat</label><input type="text" name="nama" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Stok Awal</label><input type="number" name="stok" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Satuan</label><input type="text" name="satuan" class="form-control" required placeholder="Botol, Tablet, dll"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal Catat Pemakaian -->
            <div class="modal fade" id="addPemakaianModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="addPemakaianForm">
                            <div class="modal-header">
                                <h5 class="modal-title">Catat Pemakaian Obat</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Tanggal</label>
                                    <input type="date" name="tanggal" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Nama Obat</label>
                                    <select name="obat_id" id="pemakaian_obat_id" class="form-select" required>
                                        <option value="">-- Pilih Obat --</option>
                                        ${obatOptions}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Jumlah</label>
                                    <input type="number" name="jumlah" class="form-control" required min="1">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Satuan</label>
                                    <input type="text" name="satuan" id="pemakaian_satuan" class="form-control" readonly>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    kegiatan_lain: () => {
        const data = DB.getTable('kegiatan_lain');
        const rows = data.map(i => `
            <tr>
                <td>${i.tanggal}</td>
                <td>${i.nama_kegiatan}</td>
                <td>${i.petugas}</td>
                <td>${i.keterangan}</td>
                <td class="d-print-none">
                    <button class="btn btn-sm btn-warning edit-kegiatan-btn" data-id="${i.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-kegiatan-btn" data-id="${i.id}"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Kegiatan Lain</h5>
                    <div>
                        <button class="btn btn-secondary btn-sm me-2" onclick="window.print()">
                            <i class="bi bi-printer"></i> Cetak Laporan
                        </button>
                        <button class="btn btn-success btn-sm me-2" id="downloadKegiatanLainCSV">
                            <i class="bi bi-filetype-csv"></i> Download CSV
                        </button>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addKegiatanLainModal">
                            <i class="bi bi-plus-lg"></i> Tambah Kegiatan
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Nama Kegiatan/Rapat/Pelatihan</th>
                                    <th>Petugas Pelaksana</th>
                                    <th>Keterangan</th>
                                    <th class="d-print-none">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.length ? rows : '<tr><td colspan="5" class="text-center">Belum ada data</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="addKegiatanLainModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="addKegiatanLainForm">
                            <div class="modal-header">
                                <h5 class="modal-title">Input Kegiatan Lain</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3"><label class="form-label">Tanggal</label><input type="date" name="tanggal" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Nama Kegiatan/Rapat/Pelatihan</label><input type="text" name="nama_kegiatan" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Petugas Pelaksana</label><input type="text" name="petugas" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Keterangan</label><textarea name="keterangan" class="form-control" rows="3"></textarea></div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', App.init);
