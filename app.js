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

    canEdit: () => {
        return App.state.currentUser && App.state.currentUser.role !== 'viewer';
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
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = form.username.value;
                const password = form.password.value;
                
                try {
                    const response = await fetch('api/login.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        localStorage.setItem('puskeswan_user', JSON.stringify(data));
                        App.state.currentUser = data;
                        window.location.hash = 'dashboard';
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Login Gagal',
                            text: data.error || 'Username atau password salah!'
                        });
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Terjadi kesalahan saat login.'
                    });
                }
            });
        }
    },

    bindLayoutEvents: () => {
        // Sidebar Toggle Logic
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const toggleBtn = document.getElementById('sidebarToggle');
        const closeBtn = document.getElementById('closeSidebarBtn');

        const toggleSidebar = () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        };

        const closeSidebar = () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        };

        if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
        if (overlay) overlay.addEventListener('click', closeSidebar);
        if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

        // Close sidebar when clicking a nav link on mobile
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            });
        });

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
        } else if (route === 'phms') {
            contentDiv.innerHTML = Views.phms();
            App.initPhmsEvents();
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
        } else if (route === 'kreasi_konten') {
            contentDiv.innerHTML = Views.kreasi_konten();
            App.initKreasiKontenEvents();
        } else {
            contentDiv.innerHTML = `<h1>404 Not Found</h1>`;
        }
    },

    initDashboardCharts: () => {
        const exportBtn = document.getElementById('downloadDashboardLaporanGabunganCSV');
        if (!exportBtn) return;

        exportBtn.addEventListener('click', () => {
            const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const getTanggal = (row) => {
                if (row?.tanggal) return row.tanggal;
                if (row?.created_at) return String(row.created_at).slice(0, 10);
                return '';
            };
            const getFoto = (row) => (row?.foto ? `uploads/${row.foto}` : '');

            const baseEvidenceUrl = 'http://mypuskeswansukalarang.web.id/';

            const formatTanggalDmy = (dateStr) => {
                if (!dateStr) return '';
                const s = String(dateStr).slice(0, 10);
                const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (!m) return s;
                return `${m[3]}-${m[2]}-${m[1]}`;
            };

            const buildAktivitas = ({ fitur, nama_kegiatan, kecamatan, desa, jumlah, keterangan }) => {
                const parts = [];
                if (fitur) parts.push(fitur);
                if (nama_kegiatan) parts.push(nama_kegiatan);
                if (kecamatan) parts.push(`Kec. ${kecamatan}`);
                if (desa) parts.push(`Desa ${desa}`);
                if (jumlah !== undefined && jumlah !== null && String(jumlah) !== '') parts.push(`Jumlah: ${jumlah} ekor`);
                if (keterangan) parts.push(`Ket: ${keterangan}`);
                return parts.join(' - ');
            };

            const rows = [];

            DB.getTable('pengobatan').forEach((r) => {
                const keterangan = [r.diagnosa, r.terapi].filter(Boolean).join(', ');
                rows.push({
                    tanggal: getTanggal(r),
                    timestamp: new Date(getTanggal(r)).getTime() || 0,
                    aktivitas: buildAktivitas({
                        fitur: 'Pengobatan',
                        nama_kegiatan: r.pemilik,
                        kecamatan: r.kecamatan,
                        desa: r.desa,
                        jumlah: r.jumlah,
                        keterangan
                    }),
                    foto: (() => {
                        const fotoPath = getFoto(r);
                        return fotoPath ? `${baseEvidenceUrl}${fotoPath}` : '';
                    })()
                });
            });

            DB.getTable('vaksinasi').forEach((r) => {
                const type = (r.type || '').toUpperCase();
                rows.push({
                    tanggal: getTanggal(r),
                    timestamp: new Date(getTanggal(r)).getTime() || 0,
                    aktivitas: buildAktivitas({
                        fitur: 'Vaksinasi',
                        nama_kegiatan: type,
                        kecamatan: r.kecamatan,
                        desa: r.desa,
                        jumlah: r.jumlah,
                        keterangan: r.keterangan
                    }),
                    foto: (() => {
                        const fotoPath = getFoto(r);
                        return fotoPath ? `${baseEvidenceUrl}${fotoPath}` : '';
                    })()
                });
            });

            DB.getTable('monitoring').forEach((r) => {
                const type = (r.type || '').toUpperCase();
                rows.push({
                    tanggal: getTanggal(r),
                    timestamp: new Date(getTanggal(r)).getTime() || 0,
                    aktivitas: buildAktivitas({
                        fitur: 'Monitoring',
                        nama_kegiatan: [type, r.nama].filter(Boolean).join(' '),
                        kecamatan: r.kecamatan,
                        desa: r.desa,
                        keterangan: r.keterangan
                    }),
                    foto: (() => {
                        const fotoPath = getFoto(r);
                        return fotoPath ? `${baseEvidenceUrl}${fotoPath}` : '';
                    })()
                });
            });

            DB.getTable('surveilans').forEach((r) => {
                const keterangan = [
                    r.sampel ? `Sampel: ${r.sampel}` : null,
                    r.hasil ? `Hasil: ${r.hasil}` : null
                ].filter(Boolean).join(', ');
                rows.push({
                    tanggal: getTanggal(r),
                    timestamp: new Date(getTanggal(r)).getTime() || 0,
                    aktivitas: buildAktivitas({
                        fitur: 'Surveilans',
                        nama_kegiatan: r.jenis_penyakit,
                        kecamatan: r.kecamatan,
                        desa: r.desa,
                        keterangan
                    }),
                    foto: (() => {
                        const fotoPath = getFoto(r);
                        return fotoPath ? `${baseEvidenceUrl}${fotoPath}` : '';
                    })()
                });
            });

            DB.getTable('kegiatan_lain').forEach((r) => {
                rows.push({
                    tanggal: getTanggal(r),
                    timestamp: new Date(getTanggal(r)).getTime() || 0,
                    aktivitas: buildAktivitas({
                        fitur: 'Kegiatan Lain',
                        nama_kegiatan: r.nama_kegiatan,
                        keterangan: r.keterangan
                    }),
                    foto: (() => {
                        const fotoPath = getFoto(r);
                        return fotoPath ? `${baseEvidenceUrl}${fotoPath}` : '';
                    })()
                });
            });

            DB.getTable('kunjungan_tamu').forEach((r) => {
                const keterangan = [
                    r.tujuan ? `Tujuan: ${r.tujuan}` : null,
                    r.alamat ? `Alamat: ${r.alamat}` : null,
                    r.no_hp ? `HP: ${r.no_hp}` : null
                ].filter(Boolean).join(', ');
                rows.push({
                    tanggal: getTanggal(r),
                    timestamp: new Date(getTanggal(r)).getTime() || 0,
                    aktivitas: buildAktivitas({
                        fitur: 'Kunjungan Tamu',
                        nama_kegiatan: r.nama,
                        keterangan
                    }),
                    foto: (() => {
                        const fotoPath = getFoto(r);
                        return fotoPath ? `${baseEvidenceUrl}${fotoPath}` : '';
                    })()
                });
            });

            rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            const headers = ['No', 'Tanggal', 'Aktivitas', 'Link Foto evidence'];
            const csv = [headers.join(',')].concat(
                rows.map((r, idx) => [
                    escape(idx + 1),
                    escape(formatTanggalDmy(r.tanggal)),
                    escape(r.aktivitas),
                    escape(r.foto)
                ].join(','))
            ).join('\r\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `laporan-gabungan-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
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
                            <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>
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
                a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
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
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                let fotoFilename = null;
                const fileInput = form.querySelector('input[name="foto"]');
                if (fileInput && fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    formData.append('tanggal', form.tanggal.value);
                    formData.append('feature', 'pengobatan');
                    formData.append('nama', form.pemilik.value);
                    try {
                        const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                        const result = await res.json();
                        if (res.ok) {
                            fotoFilename = result.filename;
                        } else {
                            Swal.fire('Error', result.error || 'Gagal upload foto', 'error');
                            return;
                        }
                    } catch (err) {
                        console.error(err);
                        Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
                        return;
                    }
                }

                const data = {
                    tanggal: form.tanggal.value,
                    kecamatan: form.kecamatan.value,
                    desa: form.desa.value,
                    pemilik: form.pemilik.value,
                    hewan: form.hewan.value,
                    jumlah: parseInt(form.jumlah.value),
                    diagnosa: form.diagnosa.value,
                    terapi: form.terapi.value,
                    foto: fotoFilename
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
                a.download = `pengobatan-${new Date().toISOString().slice(0,10)}.csv`;
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
                        `<textarea id="sw_terapi" class="form-control mb-2">${item.terapi}</textarea>` +
                        `<div class="mb-2"><label>Ganti Foto (Opsional)</label><input id="sw_foto" type="file" class="form-control" accept="image/*"></div>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: async () => {
                        const fileInput = document.getElementById('sw_foto');
                        let newFoto = item.foto;

                        if (fileInput.files.length > 0) {
                            const formData = new FormData();
                            formData.append('file', fileInput.files[0]);
                            formData.append('tanggal', document.getElementById('sw_tanggal').value);
                            formData.append('feature', 'pengobatan');
                            formData.append('nama', document.getElementById('sw_pemilik').value);

                            try {
                                const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                                const result = await res.json();
                                if (res.ok) {
                                    newFoto = result.filename;
                                } else {
                                    Swal.showValidationMessage(result.error || 'Gagal upload foto');
                                    return false;
                                }
                            } catch (err) {
                                Swal.showValidationMessage('Error upload foto');
                                return false;
                            }
                        }

                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            pemilik: document.getElementById('sw_pemilik').value,
                            hewan: document.getElementById('sw_hewan').value,
                            diagnosa: document.getElementById('sw_diagnosa').value,
                            terapi: document.getElementById('sw_terapi').value,
                            foto: newFoto
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
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    let fotoFilename = null;
                    const fileInput = form.querySelector('input[name="foto"]');
                    if (fileInput && fileInput.files.length > 0) {
                        const formData = new FormData();
                        formData.append('file', fileInput.files[0]);
                        formData.append('tanggal', form.tanggal.value);
                        formData.append('feature', `vaksinasi-${type}`);
                        formData.append('nama', form.desa.value);
                        try {
                            const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                            const result = await res.json();
                            if (res.ok) {
                                fotoFilename = result.filename;
                            } else {
                                Swal.fire('Error', result.error || 'Gagal upload foto', 'error');
                                return;
                            }
                        } catch (err) {
                            console.error(err);
                            Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
                            return;
                        }
                    }

                    const data = {
                        tanggal: form.tanggal.value,
                        kecamatan: form.kecamatan.value,
                        desa: form.desa.value,
                        jumlah: form.jumlah.value,
                        keterangan: form.keterangan.value,
                        foto: fotoFilename
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
                        `<textarea id="sw_ket" class="form-control mb-2">${item.keterangan || ''}</textarea>` +
                        `<div class="mb-2"><label>Ganti Foto (Opsional)</label><input id="sw_foto" type="file" class="form-control" accept="image/*"></div>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: async () => {
                        const fileInput = document.getElementById('sw_foto');
                        let newFoto = item.foto;

                        if (fileInput.files.length > 0) {
                            const formData = new FormData();
                            formData.append('file', fileInput.files[0]);
                            formData.append('tanggal', document.getElementById('sw_tanggal').value);
                            formData.append('feature', `vaksinasi-${type}`);
                            formData.append('nama', document.getElementById('sw_desa').value);

                            try {
                                const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                                const result = await res.json();
                                if (res.ok) {
                                    newFoto = result.filename;
                                } else {
                                    Swal.showValidationMessage(result.error || 'Gagal upload foto');
                                    return false;
                                }
                            } catch (err) {
                                Swal.showValidationMessage('Error upload foto');
                                return false;
                            }
                        }

                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            jumlah: document.getElementById('sw_jumlah').value,
                            keterangan: document.getElementById('sw_ket').value,
                            foto: newFoto
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
                a.download = `vaksinasi-${type}-${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });
    },
    initPhmsEvents: () => {
        ['pmk', 'lsd'].forEach(type => {
            const form = document.getElementById(`addPHMS${type.toUpperCase()}Form`);
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const data = {
                        pemilik: form.pemilik.value,
                        kecamatan: form.kecamatan.value,
                        desa: form.desa.value,
                        jumlah: parseInt(form.jumlah.value) || 0,
                        mati: parseInt(form.mati.value) || 0,
                        sehat: parseInt(form.sehat.value) || 0
                    };
                    DB.addToNested('phms', type, data);
                    App.loadPageContent('phms');
                    Swal.fire('Sukses', `Rekap PHMS ${type.toUpperCase()} tersimpan`, 'success');
                });
            }
        });

        document.querySelectorAll('.edit-phms-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const item = DB.getNested('phms', type).find(i => i.id == id);
                if (!item) return;
                const { value: formValues } = await Swal.fire({
                    title: `Edit Rekap PHMS ${type.toUpperCase()}`,
                    html:
                        `<input id="sw_pemilik" type="text" class="form-control mb-2" value="${item.pemilik || ''}" placeholder="Pemilik">` +
                        `<input id="sw_kecamatan" type="text" class="form-control mb-2" value="${item.kecamatan || ''}" placeholder="Kecamatan">` +
                        `<input id="sw_desa" type="text" class="form-control mb-2" value="${item.desa || ''}" placeholder="Desa">` +
                        `<input id="sw_jumlah" type="number" class="form-control mb-2" value="${item.jumlah ?? 0}" min="0" placeholder="Jumlah (Ekor)">` +
                        `<input id="sw_mati" type="number" class="form-control mb-2" value="${item.mati ?? 0}" min="0" placeholder="Mati">` +
                        `<input id="sw_sehat" type="number" class="form-control mb-2" value="${item.sehat ?? 0}" min="0" placeholder="Sehat">`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            pemilik: document.getElementById('sw_pemilik').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            jumlah: parseInt(document.getElementById('sw_jumlah').value) || 0,
                            mati: parseInt(document.getElementById('sw_mati').value) || 0,
                            sehat: parseInt(document.getElementById('sw_sehat').value) || 0
                        };
                    }
                });
                if (formValues) {
                    DB.updateNested('phms', type, id, formValues);
                    App.loadPageContent('phms');
                }
            });
        });

        document.querySelectorAll('.delete-phms-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const ok = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromNested('phms', type, id);
                    App.loadPageContent('phms');
                }
            });
        });

        document.querySelectorAll('.download-phms-csv-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const rows = DB.getNested('phms', type);
                const headers = ['Pemilik','Kecamatan','Desa','Jumlah','Mati','Sehat'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.pemilik),
                        escape(r.kecamatan),
                        escape(r.desa),
                        escape(r.jumlah),
                        escape(r.mati),
                        escape(r.sehat)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `phms-${type}-${new Date().toISOString().slice(0,10)}.csv`;
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
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    let fotoFilename = null;
                    const fileInput = form.querySelector('input[name="foto"]');
                    if (fileInput && fileInput.files.length > 0) {
                        const formData = new FormData();
                        formData.append('file', fileInput.files[0]);
                        formData.append('tanggal', form.tanggal.value);
                        formData.append('feature', `monitoring-${type}`);
                        formData.append('nama', form.nama.value);
                        try {
                            const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                            const result = await res.json();
                            if (res.ok) {
                                fotoFilename = result.filename;
                            } else {
                                Swal.fire('Error', result.error || 'Gagal upload foto', 'error');
                                return;
                            }
                        } catch (err) {
                            console.error(err);
                            Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
                            return;
                        }
                    }

                    const data = {
                        tanggal: form.tanggal.value,
                        nama: form.nama.value,
                        kecamatan: form.kecamatan.value,
                        desa: form.desa.value,
                        keterangan: form.keterangan.value,
                        foto: fotoFilename
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
                const defaultTanggal = item.tanggal || new Date().toISOString().slice(0, 10);
                const { value: formValues } = await Swal.fire({
                    title: `Edit ${type.toUpperCase()}`,
                    html:
                        `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${defaultTanggal}">` +
                        `<input id="sw_nama" type="text" class="form-control mb-2" value="${item.nama}">` +
                        `<input id="sw_kecamatan" type="text" class="form-control mb-2" value="${item.kecamatan}">` +
                        `<input id="sw_desa" type="text" class="form-control mb-2" value="${item.desa}">` +
                        `<textarea id="sw_ket" class="form-control mb-2">${item.keterangan || ''}</textarea>` +
                        `<div class="mb-2"><label>Ganti Foto (Opsional)</label><input id="sw_foto" type="file" class="form-control" accept="image/*"></div>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: async () => {
                        const fileInput = document.getElementById('sw_foto');
                        let newFoto = item.foto;

                        if (fileInput.files.length > 0) {
                            const formData = new FormData();
                            formData.append('file', fileInput.files[0]);
                            formData.append('tanggal', document.getElementById('sw_tanggal').value);
                            formData.append('feature', `monitoring-${type}`);
                            formData.append('nama', document.getElementById('sw_nama').value);

                            try {
                                const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                                const result = await res.json();
                                if (res.ok) {
                                    newFoto = result.filename;
                                } else {
                                    Swal.showValidationMessage(result.error || 'Gagal upload foto');
                                    return false;
                                }
                            } catch (err) {
                                Swal.showValidationMessage('Error upload foto');
                                return false;
                            }
                        }

                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            nama: document.getElementById('sw_nama').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            keterangan: document.getElementById('sw_ket').value,
                            foto: newFoto
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
                a.download = `monitoring-${type}-${new Date().toISOString().slice(0,10)}.csv`;
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
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                let fotoFilename = null;
                const fileInput = form.querySelector('input[name="foto"]');
                if (fileInput && fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    formData.append('tanggal', form.tanggal.value);
                    formData.append('feature', 'surveilans');
                    formData.append('nama', form.desa.value);
                    try {
                        const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                        const result = await res.json();
                        if (res.ok) {
                            fotoFilename = result.filename;
                        } else {
                            Swal.fire('Error', result.error || 'Gagal upload foto', 'error');
                            return;
                        }
                    } catch (err) {
                        console.error(err);
                        Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
                        return;
                    }
                }

                const data = {
                    tanggal: form.tanggal.value,
                    kecamatan: form.kecamatan.value,
                    desa: form.desa.value,
                    jenis_penyakit: form.jenis_penyakit.value,
                    sampel: form.sampel.value,
                    hasil: form.hasil.value,
                    foto: fotoFilename
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
                        `<input id="sw_hasil" type="text" class="form-control mb-2" value="${item.hasil}">` +
                        `<div class="mb-2"><label>Ganti Foto (Opsional)</label><input id="sw_foto" type="file" class="form-control" accept="image/*"></div>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: async () => {
                        const fileInput = document.getElementById('sw_foto');
                        let newFoto = item.foto;

                        if (fileInput.files.length > 0) {
                            const formData = new FormData();
                            formData.append('file', fileInput.files[0]);
                            formData.append('tanggal', document.getElementById('sw_tanggal').value);
                            formData.append('feature', 'surveilans');
                            formData.append('nama', document.getElementById('sw_desa').value);

                            try {
                                const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                                const result = await res.json();
                                if (res.ok) {
                                    newFoto = result.filename;
                                } else {
                                    Swal.showValidationMessage(result.error || 'Gagal upload foto');
                                    return false;
                                }
                            } catch (err) {
                                Swal.showValidationMessage('Error upload foto');
                                return false;
                            }
                        }

                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            kecamatan: document.getElementById('sw_kecamatan').value,
                            desa: document.getElementById('sw_desa').value,
                            jenis_penyakit: document.getElementById('sw_penyakit').value,
                            sampel: document.getElementById('sw_sampel').value,
                            hasil: document.getElementById('sw_hasil').value,
                            foto: newFoto
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
                a.download = `surveilans-${new Date().toISOString().slice(0,10)}.csv`;
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
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    let fotoFilename = null;
                    const fileInput = form.querySelector('input[name="foto"]');
                    if (fileInput && fileInput.files.length > 0) {
                        const formData = new FormData();
                        formData.append('file', fileInput.files[0]);
                        formData.append('tanggal', form.tanggal.value);
                        formData.append('feature', `surat-${type}`);
                        formData.append('nama', form.perihal.value);
                        try {
                            const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                            const result = await res.json();
                            if (res.ok) {
                                fotoFilename = result.filename;
                            } else {
                                Swal.fire('Error', result.error || 'Gagal upload foto', 'error');
                                return;
                            }
                        } catch (err) {
                            console.error(err);
                            Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
                            return;
                        }
                    }

                    const data = {
                        nomor: form.nomor.value,
                        tanggal: form.tanggal.value,
                        perihal: form.perihal.value,
                        tujuan: form.tujuan ? form.tujuan.value : '', // tujuan only for keluar
                        pengirim: form.pengirim ? form.pengirim.value : '', // pengirim only for masuk
                        foto: fotoFilename
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
                html += `<div class="mb-2"><label>Ganti Foto (Opsional)</label><input id="sw_foto" type="file" class="form-control" accept="image/*"></div>`;

                const { value: formValues } = await Swal.fire({
                    title: `Edit Surat ${type}`,
                    html,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: async () => {
                        const fileInput = document.getElementById('sw_foto');
                        let newFoto = item.foto;

                        if (fileInput.files.length > 0) {
                             const formData = new FormData();
                             formData.append('file', fileInput.files[0]);
                             formData.append('tanggal', document.getElementById('sw_tanggal').value);
                             formData.append('feature', `surat-${type}`);
                             formData.append('nama', document.getElementById('sw_perihal').value);

                             try {
                                 const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                                 const result = await res.json();
                                 if (res.ok) {
                                     newFoto = result.filename;
                                 } else {
                                     Swal.showValidationMessage(result.error || 'Gagal upload foto');
                                     return false;
                                 }
                             } catch (err) {
                                 Swal.showValidationMessage('Error upload foto');
                                 return false;
                             }
                        }

                        const payload = {
                            tanggal: document.getElementById('sw_tanggal').value,
                            nomor: document.getElementById('sw_nomor').value,
                            perihal: document.getElementById('sw_perihal').value,
                            foto: newFoto
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
                a.download = `surat-${type}-${new Date().toISOString().slice(0,10)}.csv`;
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
                a.download = `stok-obat-${new Date().toISOString().slice(0,10)}.csv`;
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
                a.download = `pemakaian-obat-${new Date().toISOString().slice(0,10)}.csv`;
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
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                let fotoFilename = null;
                const fileInput = form.querySelector('input[name="foto"]');
                if (fileInput && fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    formData.append('tanggal', form.tanggal.value);
                    formData.append('feature', 'kegiatan-lain');
                    formData.append('nama', form.nama_kegiatan.value);
                    try {
                        const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                        const result = await res.json();
                        if (res.ok) {
                            fotoFilename = result.filename;
                        } else {
                            Swal.fire('Error', result.error || 'Gagal upload foto', 'error');
                            return;
                        }
                    } catch (err) {
                        console.error(err);
                        Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
                        return;
                    }
                }

                const data = {
                    tanggal: form.tanggal.value,
                    nama_kegiatan: form.nama_kegiatan.value,
                    petugas: form.petugas.value,
                    keterangan: form.keterangan.value,
                    foto: fotoFilename
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
                        `<textarea id="sw_ket" class="form-control mb-2">${item.keterangan || ''}</textarea>` +
                        `<div class="mb-2"><label>Ganti Foto (Opsional)</label><input id="sw_foto" type="file" class="form-control" accept="image/*"></div>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: async () => {
                        const fileInput = document.getElementById('sw_foto');
                        let newFoto = item.foto;

                        if (fileInput.files.length > 0) {
                            const formData = new FormData();
                            formData.append('file', fileInput.files[0]);
                            formData.append('tanggal', document.getElementById('sw_tanggal').value);
                            formData.append('feature', 'kegiatan-lain');
                            formData.append('nama', document.getElementById('sw_nama').value);

                            try {
                                const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                                const result = await res.json();
                                if (res.ok) {
                                    newFoto = result.filename;
                                } else {
                                    Swal.showValidationMessage(result.error || 'Gagal upload foto');
                                    return false;
                                }
                            } catch (err) {
                                Swal.showValidationMessage('Error upload foto');
                                return false;
                            }
                        }

                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            nama_kegiatan: document.getElementById('sw_nama').value,
                            petugas: document.getElementById('sw_petugas').value,
                            keterangan: document.getElementById('sw_ket').value,
                            foto: newFoto
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
                a.download = `kegiatan-lain-${new Date().toISOString().slice(0,10)}.csv`;
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
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                let fotoFilename = null;
                const fileInput = form.querySelector('input[name="foto"]');
                if (fileInput && fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    formData.append('tanggal', form.tanggal.value);
                    formData.append('feature', 'kunjungan-tamu');
                    formData.append('nama', form.nama.value);
                    try {
                        const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                        const result = await res.json();
                        if (res.ok) {
                            fotoFilename = result.filename;
                        } else {
                            Swal.fire('Error', result.error || 'Gagal upload foto', 'error');
                            return;
                        }
                    } catch (err) {
                        console.error(err);
                        Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
                        return;
                    }
                }

                const data = {
                    tanggal: form.tanggal.value,
                    nama: form.nama.value,
                    alamat: form.alamat.value,
                    no_hp: form.no_hp.value,
                    tujuan: form.tujuan.value,
                    foto: fotoFilename
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
                        `<textarea id="sw_tujuan" class="form-control mb-2">${item.tujuan || ''}</textarea>` +
                        `<div class="mb-2"><label>Ganti Foto (Opsional)</label><input id="sw_foto" type="file" class="form-control" accept="image/*"></div>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: async () => {
                        const fileInput = document.getElementById('sw_foto');
                        let newFoto = item.foto;

                        if (fileInput.files.length > 0) {
                            const formData = new FormData();
                            formData.append('file', fileInput.files[0]);
                            formData.append('tanggal', document.getElementById('sw_tanggal').value);
                            formData.append('feature', 'kunjungan-tamu');
                            formData.append('nama', document.getElementById('sw_nama').value);

                            try {
                                const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                                const result = await res.json();
                                if (res.ok) {
                                    newFoto = result.filename;
                                } else {
                                    Swal.showValidationMessage(result.error || 'Gagal upload foto');
                                    return false;
                                }
                            } catch (err) {
                                Swal.showValidationMessage('Error upload foto');
                                return false;
                            }
                        }

                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            nama: document.getElementById('sw_nama').value,
                            alamat: document.getElementById('sw_alamat').value,
                            no_hp: document.getElementById('sw_nohp').value,
                            tujuan: document.getElementById('sw_tujuan').value,
                            foto: newFoto
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
                a.download = `kunjungan-tamu-${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    },
    initKreasiKontenEvents: () => {
        const form = document.getElementById('addKreasiKontenForm');
        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                let fotoFilename = null;
                const fileInput = form.querySelector('input[name="foto"]');
                if (fileInput && fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    formData.append('tanggal', form.tanggal.value);
                    formData.append('feature', 'kreasi-konten');
                    formData.append('nama', form.judul.value);
                    try {
                        const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                        const result = await res.json();
                        if (res.ok) {
                            fotoFilename = result.filename;
                        } else {
                            Swal.fire('Error', result.error || 'Gagal upload foto', 'error');
                            return;
                        }
                    } catch (err) {
                        console.error(err);
                        Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
                        return;
                    }
                }

                const data = {
                    tanggal: form.tanggal.value,
                    judul: form.judul.value,
                    nama_medsos: form.nama_medsos.value,
                    link: form.link.value,
                    foto: fotoFilename
                };
                DB.addToTable('kreasi_konten', data);
                App.loadPageContent('kreasi_konten');
                Swal.fire('Sukses', 'Konten berhasil disimpan', 'success');
            });
        }
        document.querySelectorAll('.edit-kreasi-konten-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const item = DB.getTable('kreasi_konten').find(i => i.id == id);
                if (!item) return;
                const { value: formValues } = await Swal.fire({
                    title: 'Edit Kreasi Konten',
                    html:
                        `<input id="sw_tanggal" type="date" class="form-control mb-2" value="${item.tanggal}">` +
                        `<input id="sw_judul" type="text" class="form-control mb-2" value="${item.judul}">` +
                        `<input id="sw_medsos" type="text" class="form-control mb-2" value="${item.nama_medsos}">` +
                        `<input id="sw_link" type="text" class="form-control mb-2" value="${item.link}">` +
                        `<div class="mb-2"><label>Ganti Foto (Opsional)</label><input id="sw_foto" type="file" class="form-control" accept="image/*"></div>`,
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: async () => {
                        const fileInput = document.getElementById('sw_foto');
                        let newFoto = item.foto;

                        if (fileInput.files.length > 0) {
                            const formData = new FormData();
                            formData.append('file', fileInput.files[0]);
                            formData.append('tanggal', document.getElementById('sw_tanggal').value);
                            formData.append('feature', 'kreasi-konten');
                            formData.append('nama', document.getElementById('sw_judul').value);

                            try {
                                const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                                const result = await res.json();
                                if (res.ok) {
                                    newFoto = result.filename;
                                } else {
                                    Swal.showValidationMessage(result.error || 'Gagal upload foto');
                                    return false;
                                }
                            } catch (err) {
                                Swal.showValidationMessage('Error upload foto');
                                return false;
                            }
                        }

                        return {
                            tanggal: document.getElementById('sw_tanggal').value,
                            judul: document.getElementById('sw_judul').value,
                            nama_medsos: document.getElementById('sw_medsos').value,
                            link: document.getElementById('sw_link').value,
                            foto: newFoto
                        };
                    }
                });
                if (formValues) {
                    DB.updateInTable('kreasi_konten', id, formValues);
                    App.loadPageContent('kreasi_konten');
                }
            });
        });
        document.querySelectorAll('.delete-kreasi-konten-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const ok = await Swal.fire({ title: 'Hapus konten?', icon: 'warning', showCancelButton: true });
                if (ok.isConfirmed) {
                    DB.deleteFromTable('kreasi_konten', id);
                    App.loadPageContent('kreasi_konten');
                }
            });
        });
        const csvBtn = document.getElementById('downloadKreasiKontenCSV');
        if (csvBtn) {
            csvBtn.addEventListener('click', () => {
                const rows = DB.getTable('kreasi_konten');
                const headers = ['Tanggal','Judul','Nama Medsos','Link'];
                const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const csv = [headers.join(',')].concat(
                    rows.map(r => [
                        escape(r.tanggal),
                        escape(r.judul),
                        escape(r.nama_medsos),
                        escape(r.link)
                    ].join(','))
                ).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kreasi-konten-${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    },

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
        <div class="d-flex position-relative">
            <!-- Sidebar Overlay -->
            <div id="sidebarOverlay" class="sidebar-overlay"></div>

            <!-- Sidebar -->
            <div id="sidebar" class="bg-white sidebar p-3 sticky-top" style="width: 250px; height: 100vh; overflow-y: auto;">
                <div class="d-flex justify-content-between align-items-center mb-4 ps-2">
                    <h4 class="text-primary mb-0">myPuskeswan</h4>
                    <button class="btn btn-sm btn-outline-secondary d-md-none" id="closeSidebarBtn"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="nav flex-column nav-pills">
                    <a href="#dashboard" class="nav-link ${activeRoute === 'dashboard' ? 'active' : ''}"><i class="bi bi-speedometer2 me-2"></i> Dashboard</a>
                    <a href="#pengobatan" class="nav-link ${activeRoute === 'pengobatan' ? 'active' : ''}"><i class="bi bi-bandaid me-2"></i> Pengobatan</a>
                    <a href="#vaksinasi" class="nav-link ${activeRoute === 'vaksinasi' ? 'active' : ''}"><i class="bi bi-shield-plus me-2"></i> Vaksinasi</a>
                    <a href="#phms" class="nav-link ${activeRoute === 'phms' ? 'active' : ''}"><i class="bi bi-clipboard-data me-2"></i> Rekap PHMS</a>
                    <a href="#monitoring" class="nav-link ${activeRoute === 'monitoring' ? 'active' : ''}"><i class="bi bi-eye me-2"></i> Monitoring</a>
                    <a href="#surveilans" class="nav-link ${activeRoute === 'surveilans' ? 'active' : ''}"><i class="bi bi-activity me-2"></i> Surveilans</a>
                    <a href="#surat" class="nav-link ${activeRoute === 'surat' ? 'active' : ''}"><i class="bi bi-envelope me-2"></i> Surat</a>
                    <a href="#stok" class="nav-link ${activeRoute === 'stok' ? 'active' : ''}"><i class="bi bi-box-seam me-2"></i> Stok Obat</a>
                    <a href="#kegiatan_lain" class="nav-link ${activeRoute === 'kegiatan_lain' ? 'active' : ''}"><i class="bi bi-calendar-event me-2"></i> Kegiatan Lain</a>
                    <a href="#kunjungan_tamu" class="nav-link ${activeRoute === 'kunjungan_tamu' ? 'active' : ''}"><i class="bi bi-people-fill me-2"></i> Kunjungan Tamu</a>
                    <a href="#kreasi_konten" class="nav-link ${activeRoute === 'kreasi_konten' ? 'active' : ''}"><i class="bi bi-camera-reels me-2"></i> Kreasi Konten</a>
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
                        <div class="d-flex align-items-center">
                            <button class="btn btn-outline-primary d-md-none me-3" id="sidebarToggle">
                                <i class="bi bi-list"></i>
                            </button>
                            <span class="navbar-brand mb-0 h1">
                                ${activeRoute.charAt(0).toUpperCase() + activeRoute.slice(1)}
                            </span>
                        </div>
                        <span class="me-3 d-none d-md-block">Halo, <strong>${App.state.currentUser.name}</strong></span>
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
            pengobatan: DB.getTable('pengobatan').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            vaksinasi_pmk: DB.getNested('vaksinasi', 'pmk').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            vaksinasi_rabies: DB.getNested('vaksinasi', 'rabies').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            vaksinasi_lsd: DB.getNested('vaksinasi', 'lsd').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            phms_pmk: DB.getNested('phms', 'pmk').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            phms_lsd: DB.getNested('phms', 'lsd').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0),
            monitoring_poktan: DB.getNested('monitoring', 'poktan').length,
            monitoring_bumdes: DB.getNested('monitoring', 'bumdes').length,
            surveilans: DB.getTable('surveilans').length,
            kreasi_konten: DB.getTable('kreasi_konten').length,
            kegiatan_lain: DB.getTable('kegiatan_lain').length
        };

        const stokObat = DB.getTable('stok_obat');
        const stokRows = stokObat.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.nama}</td>
                <td>${item.stok}</td>
                <td>${item.satuan}</td>
            </tr>
        `).join('');

        const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Logic for "Bahan aktivitas untuk elok" (Last 2 weeks)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        let activityData = [];
        
        // Helper to parse date string (YYYY-MM-DD) or fallback to created_at
        const getDate = (item) => {
             if (item.tanggal) return new Date(item.tanggal);
             if (item.created_at) return new Date(item.created_at);
             return new Date(0); // Fallback old date
        };

        const formatTanggalDmy = (dateStr) => {
            if (!dateStr || dateStr === '-') return dateStr || '';
            const s = String(dateStr).slice(0, 10);
            const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!m) return s;
            return `${m[3]}-${m[2]}-${m[1]}`;
        };

        // 1. Pengobatan
        DB.getTable('pengobatan').forEach(i => {
            const d = getDate(i);
            if (d >= twoWeeksAgo) {
                activityData.push({
                    tanggal: i.tanggal,
                    timestamp: d.getTime(),
                    aktivitas: `Pengobatan ${i.pemilik} (${i.hewan || '-'}) di Kec. ${i.kecamatan}, Desa ${i.desa}. Jumlah: ${i.jumlah} ekor. Ket: ${i.diagnosa}, ${i.terapi}`
                });
            }
        });

        // 2. Vaksinasi
        ['pmk', 'rabies', 'lsd'].forEach(type => {
            DB.getNested('vaksinasi', type).forEach(i => {
                const d = getDate(i);
                if (d >= twoWeeksAgo) {
                    activityData.push({
                        tanggal: i.tanggal,
                        timestamp: d.getTime(),
                        aktivitas: `Vaksinasi ${type.toUpperCase()} di Kec. ${i.kecamatan}, Desa ${i.desa}. Jumlah: ${i.jumlah} ekor. Ket: ${i.keterangan || '-'}`
                    });
                }
            });
        });

        // 3. Monitoring
        ['poktan', 'bumdes'].forEach(type => {
            DB.getNested('monitoring', type).forEach(i => {
                const d = getDate(i); // Monitoring uses created_at usually or we added tanggal implicitly
                // Check if monitoring has tanggal, if not use created_at date part
                let dateStr = i.tanggal;
                if (!dateStr && i.created_at) dateStr = i.created_at.slice(0, 10);
                
                if (d >= twoWeeksAgo) {
                    activityData.push({
                        tanggal: dateStr || '-',
                        timestamp: d.getTime(),
                        aktivitas: `Monitoring ${type === 'poktan' ? 'Kelompok Tani' : 'BUMDES'} ${i.nama} di Kec. ${i.kecamatan}, Desa ${i.desa}. Ket: ${i.keterangan || '-'}`
                    });
                }
            });
        });

        // 4. Surveilans
        DB.getTable('surveilans').forEach(i => {
            const d = getDate(i);
            if (d >= twoWeeksAgo) {
                activityData.push({
                    tanggal: i.tanggal,
                    timestamp: d.getTime(),
                    aktivitas: `Surveilans ${i.jenis_penyakit} di Kec. ${i.kecamatan}, Desa ${i.desa}. Sampel: ${i.sampel}, Hasil: ${i.hasil}`
                });
            }
        });

        // 5. Kegiatan Lain
        DB.getTable('kegiatan_lain').forEach(i => {
            const d = getDate(i);
            if (d >= twoWeeksAgo) {
                activityData.push({
                    tanggal: i.tanggal,
                    timestamp: d.getTime(),
                    aktivitas: `Kegiatan Lain: ${i.nama_kegiatan}. Ket: ${i.keterangan || '-'}`
                });
            }
        });

        // 6. Kunjungan Tamu
        DB.getTable('kunjungan_tamu').forEach(i => {
            const d = getDate(i);
            if (d >= twoWeeksAgo) {
                activityData.push({
                    tanggal: i.tanggal,
                    timestamp: d.getTime(),
                    aktivitas: `Kunjungan Tamu: ${i.nama} dari ${i.alamat}. Tujuan: ${i.tujuan}`
                });
            }
        });

        // Sort descending by date
        activityData.sort((a, b) => b.timestamp - a.timestamp);

        const activityRows = activityData.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${formatTanggalDmy(item.tanggal)}</td>
                <td>${item.aktivitas}</td>
            </tr>
        `).join('');

        return `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <button class="btn btn-success btn-sm" id="downloadDashboardLaporanGabunganCSV">
                    <i class="bi bi-filetype-csv"></i> Export Laporan Gabungan CSV
                </button>
                <h5 class="text-secondary mb-0"><i class="bi bi-calendar3 me-2"></i>${currentDate}</h5>
            </div>
            
            <div class="card mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0"><i class="bi bi-table me-2"></i>Metrik Kinerja</h5>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Kategori</th>
                                    <th>Sub Kategori</th>
                                    <th class="text-end">Jumlah</th>
                                    <th>Satuan</th>
                                </tr>
                            </thead>
                            <tbody class="align-middle">
                                <tr>
                                    <td rowspan="2">Kasus PHMS</td>
                                    <td>PMK</td>
                                    <td class="text-end">${stats.phms_pmk}</td>
                                    <td>Ekor</td>
                                </tr>
                                <tr>
                                    <td>LSD</td>
                                    <td class="text-end">${stats.phms_lsd}</td>
                                    <td>Ekor</td>
                                </tr>
                                <tr>
                                    <td rowspan="3">Vaksinasi</td>
                                    <td>PMK</td>
                                    <td class="text-end">${stats.vaksinasi_pmk}</td>
                                    <td>Ekor</td>
                                </tr>
                                <tr>
                                    <td>LSD</td>
                                    <td class="text-end">${stats.vaksinasi_lsd}</td>
                                    <td>Ekor</td>
                                </tr>
                                <tr>
                                    <td>Rabies</td>
                                    <td class="text-end">${stats.vaksinasi_rabies}</td>
                                    <td>Ekor</td>
                                </tr>
                                <tr>
                                    <td>Pengobatan</td>
                                    <td>-</td>
                                    <td class="text-end">${stats.pengobatan}</td>
                                    <td>Ekor</td>
                                </tr>
                                <tr>
                                    <td>Surveilans</td>
                                    <td>-</td>
                                    <td class="text-end">${stats.surveilans}</td>
                                    <td>Kali</td>
                                </tr>
                                <tr>
                                    <td rowspan="2">Monitoring</td>
                                    <td>Kelompok Tani</td>
                                    <td class="text-end">${stats.monitoring_poktan}</td>
                                    <td>Kali</td>
                                </tr>
                                <tr>
                                    <td>BUMDES</td>
                                    <td class="text-end">${stats.monitoring_bumdes}</td>
                                    <td>Kali</td>
                                </tr>
                                <tr>
                                    <td>Kegiatan Lain</td>
                                    <td>-</td>
                                    <td class="text-end">${stats.kegiatan_lain}</td>
                                    <td>Kegiatan</td>
                                </tr>
                                <tr>
                                    <td>Kreasi Konten</td>
                                    <td>-</td>
                                    <td class="text-end">${stats.kreasi_konten}</td>
                                    <td>Konten</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0"><i class="bi bi-list-check me-2"></i>Bahan aktivitas untuk elok</h5>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal</th>
                                    <th>Aktivitas</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${activityRows.length ? activityRows : '<tr><td colspan="3" class="text-center">Belum ada aktivitas dalam 2 minggu terakhir</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header bg-white">
                    <h5 class="mb-0"><i class="bi bi-box-seam me-2"></i>Rekap Stok Obat Terkini</h5>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Nama Obat</th>
                                    <th>Stok</th>
                                    <th>Satuan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stokRows.length ? stokRows : '<tr><td colspan="4" class="text-center">Belum ada data stok obat</td></tr>'}
                            </tbody>
                        </table>
                    </div>
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
                <td>${i.foto ? `<img src="uploads/${i.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${i.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td>
                <td class="d-print-none">
                    ${App.canEdit() ? `
                    <button class="btn btn-sm btn-warning edit-kunjungan-btn" data-id="${i.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-kunjungan-btn" data-id="${i.id}"><i class="bi bi-trash"></i></button>
                    ` : ''}
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
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addKunjunganTamuModal">
                            <i class="bi bi-plus-lg"></i> Tambah Tamu
                        </button>
                        ` : ''}
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
                                    <th>Foto</th>
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

            ${App.canEdit() ? `
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
                                <div class="mb-3"><label class="form-label">Foto Lampiran (Opsional)</label><input type="file" name="foto" class="form-control" accept="image/*"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    },

    users: () => {
        const users = DB.getTable('users');
        const rows = users.map(u => `
            <tr>
                <td>${u.username}</td>
                <td>${u.name}</td>
                <td><span class="badge bg-${u.role === 'admin' ? 'danger' : (u.role === 'viewer' ? 'info' : 'secondary')}">${u.role}</span></td>
                <td>
                    ${App.canEdit() ? `
                        <button class="btn btn-sm btn-warning edit-user-btn" data-id="${u.id}" data-username="${u.username}" data-name="${u.name}" data-role="${u.role}"><i class="bi bi-pencil"></i></button>
                        ${u.username !== 'admin' ? 
                            `<button class="btn btn-sm btn-danger delete-user-btn" data-id="${u.id}"><i class="bi bi-trash"></i></button>` 
                            : ''}
                    ` : ''}
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
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addUserModal">
                            <i class="bi bi-plus-lg"></i> Tambah User
                        </button>
                        ` : ''}
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

            ${App.canEdit() ? `
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
                                        <option value="viewer">Viewer</option>
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
            ` : ''}
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
                <td>${item.foto ? `<img src="uploads/${item.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${item.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td>
                <td class="d-print-none">
                    ${App.canEdit() ? `
                    <button class="btn btn-sm btn-warning edit-pengobatan-btn" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-pengobatan-btn" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                    ` : ''}
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
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addPengobatanModal">
                            <i class="bi bi-plus-lg"></i> Input Data
                        </button>
                        ` : ''}
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
                                    <th>Foto</th>
                                    <th class="d-print-none">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.length ? rows : '<tr><td colspan="10" class="text-center">Belum ada data</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            ${App.canEdit() ? `
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
                                <div class="mb-3">
                                    <label class="form-label">Foto Lampiran (Opsional)</label>
                                    <input type="file" name="foto" class="form-control" accept="image/*">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            ` : ''}
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
                    <td>${item.foto ? `<img src="uploads/${item.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${item.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td>
                    <td class="d-print-none">
                        ${App.canEdit() ? `
                        <button class="btn btn-sm btn-warning edit-vaksinasi-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-danger delete-vaksinasi-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                        ` : ''}
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
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#add${type.toUpperCase()}Modal">
                            <i class="bi bi-plus-lg"></i> Tambah Data ${type.toUpperCase()}
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                ${App.canEdit() ? `
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
                                    <div class="mb-3"><label class="form-label">Foto Lampiran (Opsional)</label><input type="file" name="foto" class="form-control" accept="image/*"></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                ` : ''}
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

    phms: () => {
        const renderTable = (type) => {
            const data = DB.getNested('phms', type);
            const rows = data.map(item => `
                <tr>
                    <td>${item.pemilik || ''}</td>
                    <td>${item.kecamatan || ''}</td>
                    <td>${item.desa || ''}</td>
                    <td>${item.jumlah ?? 0}</td>
                    <td>${item.mati ?? 0}</td>
                    <td>${item.sehat ?? 0}</td>
                    <td class="d-print-none">
                        ${App.canEdit() ? `
                        <button class="btn btn-sm btn-warning edit-phms-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-danger delete-phms-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');

            return `
                <div class="table-responsive mt-3">
                    <table class="table table-bordered">
                        <thead><tr><th>Pemilik</th><th>Kecamatan</th><th>Desa</th><th>Jumlah (Ekor)</th><th>Mati</th><th>Sehat</th><th class="d-print-none">Aksi</th></tr></thead>
                        <tbody>${rows.length ? rows : '<tr><td colspan="7" class="text-center">Belum ada data</td></tr>'}</tbody>
                    </table>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <button class="btn btn-secondary btn-sm" onclick="window.print()">
                        <i class="bi bi-printer"></i> Cetak Laporan ${type.toUpperCase()}
                    </button>
                    <div>
                        <button class="btn btn-success btn-sm me-2 download-phms-csv-btn" data-type="${type}">
                            <i class="bi bi-filetype-csv"></i> Download CSV ${type.toUpperCase()}
                        </button>
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addPHMS${type.toUpperCase()}Modal">
                            <i class="bi bi-plus-lg"></i> Tambah Data ${type.toUpperCase()}
                        </button>
                        ` : ''}
                    </div>
                </div>

                ${App.canEdit() ? `
                <div class="modal fade" id="addPHMS${type.toUpperCase()}Modal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <form id="addPHMS${type.toUpperCase()}Form">
                                <div class="modal-header">
                                    <h5 class="modal-title">Input Rekap PHMS ${type.toUpperCase()}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3"><label class="form-label">Pemilik</label><input type="text" name="pemilik" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Kecamatan</label><input type="text" name="kecamatan" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Desa</label><input type="text" name="desa" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Jumlah (Ekor)</label><input type="number" name="jumlah" class="form-control" required min="0" value="0"></div>
                                    <div class="mb-3"><label class="form-label">Mati</label><input type="number" name="mati" class="form-control" required min="0" value="0"></div>
                                    <div class="mb-3"><label class="form-label">Sehat</label><input type="number" name="sehat" class="form-control" required min="0" value="0"></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                ` : ''}
            `;
        };

        return `
            <div class="card">
                <div class="card-header">
                    <ul class="nav nav-tabs card-header-tabs" id="phmsTab" role="tablist">
                        <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#phms_pmk">PMK</a></li>
                        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#phms_lsd">LSD</a></li>
                    </ul>
                </div>
                <div class="card-body">
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="phms_pmk">${renderTable('pmk')}</div>
                        <div class="tab-pane fade" id="phms_lsd">${renderTable('lsd')}</div>
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
                    <td>${item.tanggal || '-'}</td>
                    <td>${item.nama}</td>
                    <td>${item.kecamatan}</td>
                    <td>${item.desa}</td>
                    <td>${item.keterangan}</td>
                    <td>${item.foto ? `<img src="uploads/${item.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${item.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td>
                    <td class="d-print-none">
                        ${App.canEdit() ? `
                        <button class="btn btn-sm btn-warning edit-monitoring-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-danger delete-monitoring-btn" data-type="${type}" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
            return `
                <div class="table-responsive mt-3">
                    <table class="table table-bordered">
                        <thead><tr><th>Tanggal</th><th>Nama Kelompok/Bumdes</th><th>Kecamatan</th><th>Desa</th><th>Keterangan</th><th>Foto</th><th class="d-print-none">Aksi</th></tr></thead>
                        <tbody>${rows.length ? rows : '<tr><td colspan="7" class="text-center">Belum ada data</td></tr>'}</tbody>
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
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#add${type}Modal">
                            <i class="bi bi-plus-lg"></i> Tambah Data
                        </button>
                        ` : ''}
                    </div>
                </div>

                ${App.canEdit() ? `
                <div class="modal fade" id="add${type}Modal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <form id="add${type}Form">
                                <div class="modal-header">
                                    <h5 class="modal-title">Input ${type.toUpperCase()}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3"><label class="form-label">Tanggal</label><input type="date" name="tanggal" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Nama</label><input type="text" name="nama" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Kecamatan</label><input type="text" name="kecamatan" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Desa</label><input type="text" name="desa" class="form-control" required></div>
                                    <div class="mb-3"><label class="form-label">Keterangan</label><textarea name="keterangan" class="form-control"></textarea></div>
                                    <div class="mb-3"><label class="form-label">Foto Lampiran (Opsional)</label><input type="file" name="foto" class="form-control" accept="image/*"></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                ` : ''}
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
                <td>${item.foto ? `<img src="uploads/${item.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${item.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td>
                <td class="d-print-none">
                    ${App.canEdit() ? `
                    <button class="btn btn-sm btn-warning edit-surveilans-btn" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-surveilans-btn" data-id="${item.id}"><i class="bi bi-trash"></i></button>
                    ` : ''}
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
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addSurveilansModal">
                            <i class="bi bi-plus-lg"></i> Input Data
                        </button>
                        ` : ''}
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
                                    <th>Foto</th>
                                    <th class="d-print-none">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.length ? rows : '<tr><td colspan="8" class="text-center">Belum ada data</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            ${App.canEdit() ? `
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
                                <div class="mb-3"><label class="form-label">Foto Lampiran (Opsional)</label><input type="file" name="foto" class="form-control" accept="image/*"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    },

    surat: () => {
        const renderTable = (type) => {
            const data = DB.getNested('surat', type);
            // Different columns based on type
            let headers = '';
            let rows = '';
            
            if (type === 'masuk') {
                headers = '<th>Tanggal</th><th>No. Surat</th><th>Pengirim</th><th>Perihal</th><th>Foto</th><th class="d-print-none">Aksi</th>';
                rows = data.map(i => `<tr><td>${i.tanggal}</td><td>${i.nomor}</td><td>${i.pengirim}</td><td>${i.perihal}</td><td>${i.foto ? `<img src="uploads/${i.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${i.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td><td class="d-print-none">${App.canEdit() ? `<button class="btn btn-sm btn-warning edit-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-danger delete-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-trash"></i></button>` : ''}</td></tr>`).join('');
            } else if (type === 'keluar') {
                headers = '<th>Tanggal</th><th>No. Surat</th><th>Tujuan</th><th>Perihal</th><th>Foto</th><th class="d-print-none">Aksi</th>';
                rows = data.map(i => `<tr><td>${i.tanggal}</td><td>${i.nomor}</td><td>${i.tujuan}</td><td>${i.perihal}</td><td>${i.foto ? `<img src="uploads/${i.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${i.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td><td class="d-print-none">${App.canEdit() ? `<button class="btn btn-sm btn-warning edit-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-danger delete-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-trash"></i></button>` : ''}</td></tr>`).join('');
            } else {
                headers = '<th>Tanggal</th><th>No. Surat</th><th>Perihal</th><th>Keterangan</th><th>Foto</th><th class="d-print-none">Aksi</th>';
                rows = data.map(i => `<tr><td>${i.tanggal}</td><td>${i.nomor}</td><td>${i.perihal}</td><td>${i.keterangan}</td><td>${i.foto ? `<img src="uploads/${i.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${i.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td><td class="d-print-none">${App.canEdit() ? `<button class="btn btn-sm btn-warning edit-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-danger delete-surat-btn" data-type="${type}" data-id="${i.id}"><i class="bi bi-trash"></i></button>` : ''}</td></tr>`).join('');
            }

            return `
                <div class="table-responsive mt-3">
                    <table class="table table-bordered">
                        <thead><tr>${headers}</tr></thead>
                        <tbody>${rows.length ? rows : `<tr><td colspan="6" class="text-center">Belum ada data</td></tr>`}</tbody>
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
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addSurat${type}Modal">
                            <i class="bi bi-plus-lg"></i> Tambah Surat ${type}
                        </button>
                        ` : ''}
                    </div>
                </div>

                ${App.canEdit() ? `
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
                                    <div class="mb-3"><label class="form-label">Foto Lampiran (Opsional)</label><input type="file" name="foto" class="form-control" accept="image/*"></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                ` : ''}
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
                    ${App.canEdit() ? `
                    <button class="btn btn-sm btn-info edit-obat-btn" data-id="${s.id}" data-nama="${s.nama}" data-satuan="${s.satuan}"><i class="bi bi-pencil-square"></i> Edit Obat</button>
                    <button class="btn btn-sm btn-warning update-stock-btn" data-id="${s.id}" data-stok="${s.stok}"><i class="bi bi-pencil"></i> Edit Stok</button>
                    ${App.state.currentUser.role === 'admin' ? 
                        `<button class="btn btn-sm btn-danger delete-stock-btn" data-id="${s.id}"><i class="bi bi-trash"></i></button>` 
                        : ''}
                    ` : ''}
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
                    ${App.canEdit() ? `
                    <button class="btn btn-sm btn-warning edit-pemakaian-btn" data-id="${p.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-pemakaian-btn" data-id="${p.id}"><i class="bi bi-trash"></i></button>
                    ` : ''}
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
                                ${App.canEdit() ? `
                                <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addStokModal">
                                    <i class="bi bi-plus-lg"></i> Tambah Obat Baru
                                </button>
                                ` : ''}
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
                                ${App.canEdit() ? `
                                <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addPemakaianModal">
                                    <i class="bi bi-plus-lg"></i> Catat Pemakaian
                                </button>
                                ` : ''}
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

            ${App.canEdit() ? `
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
            ` : ''}
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
                <td>${i.foto ? `<img src="uploads/${i.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${i.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td>
                <td class="d-print-none">
                    ${App.canEdit() ? `
                    <button class="btn btn-sm btn-warning edit-kegiatan-btn" data-id="${i.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-kegiatan-btn" data-id="${i.id}"><i class="bi bi-trash"></i></button>
                    ` : ''}
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
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addKegiatanLainModal">
                            <i class="bi bi-plus-lg"></i> Tambah Kegiatan
                        </button>
                        ` : ''}
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
                                    <th>Foto</th>
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

            ${App.canEdit() ? `
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
                                <div class="mb-3"><label class="form-label">Foto Lampiran (Opsional)</label><input type="file" name="foto" class="form-control" accept="image/*"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    },

    kreasi_konten: () => {
        const data = DB.getTable('kreasi_konten');
        const rows = data.map(i => `
            <tr>
                <td>${i.tanggal}</td>
                <td>${i.judul}</td>
                <td>${i.nama_medsos}</td>
                <td><a href="${i.link}" target="_blank">${i.link}</a></td>
                <td>${i.foto ? `<img src="uploads/${i.foto}" class="d-none d-print-block img-thumbnail report-img"><a href="uploads/${i.foto}" target="_blank" class="btn btn-sm btn-outline-primary d-print-none"><i class="bi bi-image"></i> Lihat</a>` : '-'}</td>
                <td class="d-print-none">
                    ${App.canEdit() ? `
                    <button class="btn btn-sm btn-warning edit-kreasi-konten-btn" data-id="${i.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger delete-kreasi-konten-btn" data-id="${i.id}"><i class="bi bi-trash"></i></button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Kreasi Konten</h5>
                    <div>
                        <button class="btn btn-secondary btn-sm me-2" onclick="window.print()">
                            <i class="bi bi-printer"></i> Cetak Laporan
                        </button>
                        <button class="btn btn-success btn-sm me-2" id="downloadKreasiKontenCSV">
                            <i class="bi bi-filetype-csv"></i> Download CSV
                        </button>
                        ${App.canEdit() ? `
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addKreasiKontenModal">
                            <i class="bi bi-plus-lg"></i> Tambah Konten
                        </button>
                        ` : ''}
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Judul</th>
                                    <th>Nama Medsos</th>
                                    <th>Link</th>
                                    <th>Screenshoot</th>
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

            ${App.canEdit() ? `
            <div class="modal fade" id="addKreasiKontenModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="addKreasiKontenForm">
                            <div class="modal-header">
                                <h5 class="modal-title">Input Kreasi Konten</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3"><label class="form-label">Tanggal</label><input type="date" name="tanggal" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Judul</label><input type="text" name="judul" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Nama Medsos</label><input type="text" name="nama_medsos" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Link</label><input type="text" name="link" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Screenshoot (Opsional)</label><input type="file" name="foto" class="form-control" accept="image/*"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', App.init);
