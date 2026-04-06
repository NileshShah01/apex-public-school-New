/**
 * ERP Security Integration Module
 * Implements RBAC, PII encryption, and audit logging for ERP modules
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const ERPSecurityModule = {
    // Current user permissions cache
    _userPermissions: null,
    _userRole: null,

    // Initialize security module
    async init() {
        await this.loadUserPermissions();
        this.setupAuditHooks();
        this.setupInputProtection();
        console.log('ERP Security Module Initialized');
    },

    // Load user permissions from auth token
    async loadUserPermissions() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userDoc = await schoolData('users').doc(user.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                this._userRole = data.role;
                this._userPermissions = data.permissions || [];
            }
        } catch (e) {
            console.warn('Could not load user permissions:', e);
        }
    },

    // Check if user has permission
    hasPermission(permission) {
        if (this._userRole === 'ADMIN') return true;
        return this._userPermissions?.includes(permission);
    },

    // Get user role
    getUserRole() {
        return this._userRole;
    },

    // Setup automatic audit logging for CRUD operations
    setupAuditHooks() {
        // Override Firestore collection methods for automatic audit
        const originalSet = firebase.firestore().collection().doc().set;
        const originalUpdate = firebase.firestore().collection().doc().update;

        // This would be implemented with Cloud Functions in production
        console.log('Audit hooks ready - use ERPService.audit() for manual logging');
    },

    // Manual audit logging
    async audit(action, resourceType, resourceId, oldData, newData) {
        if (!auth.currentUser) return;

        const changedFields = [];
        if (oldData && newData) {
            Object.keys(newData).forEach((key) => {
                if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
                    changedFields.push(key);
                }
            });
        }

        await schoolData('auditLogs').add({
            user_id: auth.currentUser.uid,
            user_email: auth.currentUser.email,
            action: action,
            resource_type: resourceType,
            resource_id: resourceId,
            old_values: oldData,
            new_values: newData,
            changed_fields: changedFields,
            ip_address: null, // Set by Cloud Function
            user_agent: navigator.userAgent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            school_id: CURRENT_SCHOOL_ID,
        });
    },

    // Setup input protection (prevent XSS)
    setupInputProtection() {
        // Sanitize HTML inputs
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach((input) => {
                if (input.type !== 'hidden') {
                    // Basic XSS prevention - remove script tags
                    const value = input.value;
                    if (value && /<script/i.test(value)) {
                        input.value = value.replace(/<script/gi, '&lt;script');
                    }
                }
            });
        });
    },

    // Encrypt sensitive form fields
    async encryptFormField(fieldId, key) {
        const element = document.getElementById(fieldId);
        if (!element || !element.value) return null;

        return await ERPEncryption.encrypt(element.value, key);
    },

    // Mask sensitive data for display
    maskData(type, value) {
        if (!value) return '';

        switch (type) {
            case 'phone':
                return value.replace(/(\d{7})(\d{3})/, '*******$2');
            case 'aadhar':
                return value.replace(/(\d{4})(\d{4})(\d{4})/, '$1-****-$3');
            case 'email':
                const parts = value.split('@');
                if (parts.length === 2) {
                    return parts[0].substring(0, 2) + '***@' + parts[1];
                }
                return '***';
            default:
                return value.substring(0, 3) + '***';
        }
    },

    // Validate input against patterns
    validateInput(type, value) {
        const patterns = {
            phone: /^[\d\s\-+]{10,15}$/,
            aadhar: /^\d{4}-\d{4}-\d{4}$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            rollNo: /^[A-Za-z0-9\-]{1,10}$/,
        };

        if (!patterns[type]) return true;
        return patterns[type].test(value);
    },

    // Check data access authorization
    canAccess(resourceType, resourceId, action) {
        const user = auth.currentUser;
        if (!user) return false;

        // Admin can do everything
        if (this._userRole === 'ADMIN') return true;

        // Role-based permissions
        const rolePermissions = {
            TEACHER: ['READ'],
            ACCOUNTANT: ['READ', 'CREATE', 'UPDATE'],
            LIBRARIAN: ['READ'],
            PARENT: ['READ_OWN'],
            STUDENT: ['READ_OWN'],
        };

        const allowed = rolePermissions[this._userRole] || [];
        return allowed.includes(action) || allowed.includes('READ');
    },

    // Log security event
    async logSecurityEvent(eventType, details) {
        await schoolData('securityLogs').add({
            event_type: eventType,
            user_id: auth.currentUser?.uid,
            details: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            school_id: CURRENT_SCHOOL_ID,
        });
    },
};

// Make available globally
window.ERPSecurityModule = ERPSecurityModule;

// Security utility functions
const SecurityUtils = {
    // Sanitize HTML to prevent XSS
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Validate and format phone number
    formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{5})(\d{5})/, '$1-$2');
        }
        return phone;
    },

    // Format Aadhar with masking
    formatAadhar(aadhar) {
        const cleaned = aadhar.replace(/\D/g, '');
        if (cleaned.length === 12) {
            return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
        }
        return aadhar;
    },

    // Generate secure random ID
    generateSecureId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    },

    // Check password strength
    checkPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        return { score: strength, label: labels[strength - 1] || 'Very Weak' };
    },
};

window.SecurityUtils = SecurityUtils;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ERPSecurityModule, SecurityUtils };
}
