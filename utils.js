// utils.js - Funções utilitárias para a aplicação

// Formatação de moeda (BRL)
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Formatação de data
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
};

// Formatação de data e hora
const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

// Validação de email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validação de telefone
const isValidPhone = (phone) => {
    // Aceita formatos: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX ou sem formatação
    const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;
    return phoneRegex.test(phone);
};

// Validação de formulário genérica
const validateForm = (formData, requiredFields) => {
    const errors = {};
    let isValid = true;

    // Verifica campos obrigatórios
    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].trim() === '') {
            errors[field] = 'Este campo é obrigatório';
            isValid = false;
        }
    });

    // Validações específicas
    if (formData.email && !isValidEmail(formData.email)) {
        errors.email = 'Email inválido';
        isValid = false;
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
        errors.phone = 'Telefone inválido';
        isValid = false;
    }

    return { isValid, errors };
};

// Gera um ID único
const generateId = (prefix = '') => {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Tradução de status de pedido
const translateOrderStatus = (status) => {
    const statusMap = {
        'pending': 'Pendente',
        'in-progress': 'Em andamento',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
};

// Classe CSS para status de pedido
const getStatusClass = (status) => {
    const classMap = {
        'pending': 'status-pending',
        'in-progress': 'status-in-progress',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return classMap[status] || '';
};

// Persistência de dados no localStorage
const storage = {
    get: (key, defaultValue = null) => {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error(`Erro ao ler ${key} do localStorage:`, error);
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar ${key} no localStorage:`, error);
            return false;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Erro ao remover ${key} do localStorage:`, error);
            return false;
        }
    },
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Erro ao limpar localStorage:', error);
            return false;
        }
    }
};

// Debounce para evitar múltiplas chamadas de função
const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

// Exporta as funções utilitárias
const Utils = {
    formatCurrency,
    formatDate,
    formatDateTime,
    isValidEmail,
    isValidPhone,
    validateForm,
    generateId,
    translateOrderStatus,
    getStatusClass,
    storage,
    debounce
};