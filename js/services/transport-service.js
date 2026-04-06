/**
 * Transport Service - Routes, Vehicles, Student Mapping
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const TransportService = {
    // ==================== ROUTES ====================

    async getRoutes() {
        const snapshot = await schoolData('transportRoutes').orderBy('routeName').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getRoute(routeId) {
        const doc = await schoolDoc('transportRoutes', routeId).get();
        if (!doc.exists) throw new Error('Route not found');
        return { id: doc.id, ...doc.data() };
    },

    async createRoute(data) {
        const docRef = await schoolData('transportRoutes').add(
            withSchool({
                routeName: data.routeName,
                routeNumber: data.routeNumber || '',
                startPoint: data.startPoint,
                endPoint: data.endPoint,
                viaStops: data.viaStops || [],
                totalDistance: data.totalDistance || 0,
                estimatedTime: data.estimatedTime || 0,
                vehicleType: data.vehicleType || 'BUS',
                capacity: parseInt(data.capacity) || 50,
                fare: parseFloat(data.fare) || 0,
                isActive: true,
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateRoute(routeId, data) {
        await schoolDoc('transportRoutes', routeId).update({
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: routeId, status: 'UPDATED' };
    },

    async deleteRoute(routeId) {
        // Check if students assigned
        const assigned = await schoolData('students').where('transport_route_id', '==', routeId).limit(1).get();

        if (!assigned.empty) {
            throw new Error('Cannot delete route with assigned students');
        }

        await schoolDoc('transportRoutes', routeId).update({
            isActive: false,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: routeId, status: 'DELETED' };
    },

    // ==================== STOPS ====================

    async getStops(routeId) {
        const route = await this.getRoute(routeId);
        return route.viaStops || [];
    },

    async addStop(routeId, stopData) {
        const route = await this.getRoute(routeId);
        const stops = route.viaStops || [];

        stops.push({
            id: Date.now().toString(),
            name: stopData.name,
            arrivalTime: stopData.arrivalTime,
            departureTime: stopData.departureTime,
            address: stopData.address || '',
        });

        await schoolDoc('transportRoutes', routeId).update({
            viaStops: stops,
        });

        return { status: 'ADDED' };
    },

    async removeStop(routeId, stopId) {
        const route = await this.getRoute(routeId);
        const stops = (route.viaStops || []).filter((s) => s.id !== stopId);

        await schoolDoc('transportRoutes', routeId).update({
            viaStops: stops,
        });

        return { status: 'REMOVED' };
    },

    // ==================== VEHICLES ====================

    async getVehicles() {
        const snapshot = await schoolData('transportVehicles').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async addVehicle(data) {
        const docRef = await schoolData('transportVehicles').add(
            withSchool({
                vehicleNumber: data.vehicleNumber,
                vehicleType: data.vehicleType || 'BUS',
                capacity: parseInt(data.capacity) || 50,
                driverName: data.driverName || '',
                driverPhone: data.driverPhone || '',
                insuranceExpiry: data.insuranceExpiry || null,
                permitExpiry: data.permitExpiry || null,
                isActive: true,
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async assignVehicle(routeId, vehicleId) {
        await schoolDoc('transportRoutes', routeId).update({
            assignedVehicle: vehicleId,
        });
        return { status: 'ASSIGNED' };
    },

    // ==================== STUDENT MAPPING ====================

    async assignStudent(studentId, routeId, stopId) {
        await schoolDoc('students', studentId).update({
            transport: true,
            transport_route_id: routeId,
            transport_stop_id: stopId,
            transport_fare: (await this.getRoute(routeId)).fare,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return { status: 'ASSIGNED' };
    },

    async removeTransport(studentId) {
        await schoolDoc('students', studentId).update({
            transport: false,
            transport_route_id: null,
            transport_stop_id: null,
            transport_fare: 0,
            transportRemovedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return { status: 'REMOVED' };
    },

    async getStudentsByRoute(routeId) {
        const snapshot = await schoolData('students')
            .where('transport_route_id', '==', routeId)
            .where('transport', '==', true)
            .get();

        const students = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Group by stop
        const byStop = {};
        students.forEach((s) => {
            const stopId = s.transport_stop_id;
            if (!byStop[stopId]) byStop[stopId] = [];
            byStop[stopId].push(s);
        });

        return { students, byStop };
    },

    // ==================== REPORTS ====================

    async getRouteOccupancy(routeId) {
        const students = await this.getStudentsByRoute(routeId);
        const route = await this.getRoute(routeId);

        return {
            routeName: route.routeName,
            capacity: route.capacity,
            assigned: students.students.length,
            percentage: ((students.students.length / route.capacity) * 100).toFixed(1),
        };
    },

    async getTransportSummary() {
        const routes = await this.getRoutes();
        const summary = [];

        for (const route of routes) {
            const students = await this.getStudentsByRoute(route.id);
            summary.push({
                routeId: route.id,
                routeName: route.routeName,
                capacity: route.capacity,
                assigned: students.students.length,
                fare: route.fare,
                revenue: students.students.length * route.fare,
            });
        }

        return summary;
    },

    async generateTransportID(studentId) {
        const student = await schoolDoc('students', studentId).get();
        const data = student.data();

        if (!data.transport) return null;

        const route = await this.getRoute(data.transport_route_id);
        const stop = route.viaStops?.find((s) => s.id === data.transport_stop_id);

        return {
            studentId: data.student_id,
            studentName: data.name,
            class: data.class,
            routeName: route.routeName,
            stopName: stop?.name || 'N/A',
            fare: data.transport_fare,
            validFrom: data.join_date,
        };
    },
};

window.TransportService = TransportService;
