/**
 * erp-transport.js - School Transportation & Route Management
 */

const ERPTransport = {
    routes: [],

    async init() {
        console.log('ERP Transport Initializing...');
        await this.loadRoutes();

        // Setup Searchable Student Select for Mapping Form
        if (typeof initSearchableSelect === 'function' && document.getElementById('map_student_select')) {
            initSearchableSelect('map_student_select', (s) => {
                document.getElementById('trans_student_id').value = s.studentId || s.student_id;
            });
        }
    },

    async loadRoutes() {
        const tbody = document.getElementById('routeListBody');
        const routeSelect = document.getElementById('trans_route_select');
        if (!tbody) return;

        try {
            const snap = await schoolData('transport_routes').orderBy('routeName').get();
            this.routes = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            if (this.routes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No routes defined.</td></tr>';
                return;
            }

            tbody.innerHTML = this.routes
                .map(
                    (r) => `
                <tr>
                    <td><b>${r.routeName}</b></td>
                    <td>${r.vehicleNo || '-'}</td>
                    <td>${r.driverName || '-'}</td>
                    <td>${(r.stops || []).length} Stops</td>
                    <td>
                        <button class="btn-portal btn-ghost" onclick="ERPTransport.editRoute('${r.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `
                )
                .join('');

            if (routeSelect) {
                routeSelect.innerHTML =
                    '<option value="">Select Route</option>' +
                    this.routes.map((r) => `<option value="${r.id}">${r.routeName} [${r.vehicleNo}]</option>`).join('');
            }
        } catch (e) {
            console.error(e);
        }
    },

    async saveRoute(event) {
        if (event) event.preventDefault();
        const form = document.getElementById('addRouteForm');
        const name = document.getElementById('route_name').value;
        const vehicle = document.getElementById('route_vehicle').value;
        const driver = document.getElementById('route_driver').value;
        const stopsStr = document.getElementById('route_stops').value;

        const stops = stopsStr
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== '');

        const routeData = {
            routeName: name,
            vehicleNo: vehicle,
            driverName: driver,
            stops: stops,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        try {
            showLoading(true);
            await schoolData('transport_routes').add(withSchool(routeData));
            showToast('Route added successfully!');
            form.reset();
            await this.loadRoutes();
        } catch (e) {
            console.error(e);
            showToast('Error adding route', 'error');
        } finally {
            showLoading(false);
        }
    },

    async loadStops() {
        const routeId = document.getElementById('trans_route_select').value;
        const stopSelect = document.getElementById('trans_stop_select');
        if (!stopSelect) return;

        if (!routeId) {
            stopSelect.innerHTML = '<option value="">Select Route First</option>';
            return;
        }

        const route = this.routes.find((r) => r.id === routeId);
        if (route && route.stops) {
            stopSelect.innerHTML =
                '<option value="">Select Stop</option>' +
                route.stops.map((s) => `<option value="${s}">${s}</option>`).join('');
        }
    },

    async assignTransport(event) {
        if (event) event.preventDefault();
        const studentId = document.getElementById('trans_student_id').value;
        const routeId = document.getElementById('trans_route_select').value;
        const stop = document.getElementById('trans_stop_select').value;

        if (!studentId || !routeId) {
            showToast('Please select student and route', 'error');
            return;
        }

        try {
            showLoading(true);
            const route = this.routes.find((r) => r.id === routeId);

            // Update student record with transport details
            // We search for student by studentId field
            const studentSnap = await schoolData('students').where('studentId', '==', studentId).limit(1).get();
            if (studentSnap.empty) {
                showToast('Student not found', 'error');
                return;
            }

            const studentDoc = studentSnap.docs[0];
            await studentDoc.ref.update({
                transport_route: route.routeName,
                transport_stop: stop,
                is_transport_user: 'Yes',
            });

            showToast('Transport assigned successfully!');
            document.getElementById('mapTransportForm').reset();
        } catch (e) {
            console.error(e);
            showToast('Error assigning transport', 'error');
        } finally {
            showLoading(false);
        }
    },
};

window.ERPTransport = ERPTransport;
