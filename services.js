// services.js - Serviços para conectar a UI com a API

// Serviço de Autenticação
const AuthService = {
    async login(email, password) {
        try {
            showLoading(true);
            const response = await api.login(email, password);
            showLoading(false);
            return response;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao fazer login:', error);
            return { success: false, message: 'Erro ao fazer login. Tente novamente.' };
        }
    },

    async logout() {
        try {
            showLoading(true);
            const response = await api.logout();
            showLoading(false);
            return response;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao fazer logout:', error);
            return { success: false, message: 'Erro ao fazer logout. Tente novamente.' };
        }
    },

    getCurrentUser() {
        return api.getCurrentUser();
    },

    isLoggedIn() {
        return api.getCurrentUser() !== null;
    }
};

// Serviço de Produtos
const ProductService = {
    async getProducts() {
        try {
            showLoading(true);
            const products = await api.getProducts();
            showLoading(false);
            return products;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao buscar produtos:', error);
            showNotification('Erro ao buscar produtos. Tente novamente.', 'error');
            return [];
        }
    },

    async getProductsByCategory(category) {
        try {
            showLoading(true);
            const products = await api.getProductsByCategory(category);
            showLoading(false);
            return products;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao filtrar produtos:', error);
            showNotification('Erro ao filtrar produtos. Tente novamente.', 'error');
            return [];
        }
    },

    async searchProducts(query) {
        try {
            showLoading(true);
            const products = await api.searchProducts(query);
            showLoading(false);
            return products;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao buscar produtos:', error);
            showNotification('Erro ao buscar produtos. Tente novamente.', 'error');
            return [];
        }
    }
};

// Serviço de Carrinho
const CartService = {
    getCart() {
        return api.getCart();
    },

    async addToCart(productId, quantity = 1) {
        try {
            showLoading(true);
            const product = await api.getProductById(productId);
            if (!product) {
                showLoading(false);
                showNotification('Produto não encontrado', 'error');
                return { success: false };
            }
            
            const response = await api.addToCart(product, quantity);
            showLoading(false);
            
            if (response.success) {
                showNotification(`${product.name} adicionado ao carrinho!`, 'success');
            }
            
            return response;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao adicionar ao carrinho:', error);
            showNotification('Erro ao adicionar ao carrinho. Tente novamente.', 'error');
            return { success: false };
        }
    },

    async updateQuantity(productId, quantity) {
        try {
            const response = await api.updateCartItemQuantity(productId, quantity);
            return response;
        } catch (error) {
            console.error('Erro ao atualizar quantidade:', error);
            showNotification('Erro ao atualizar quantidade. Tente novamente.', 'error');
            return { success: false };
        }
    },

    async removeFromCart(productId) {
        try {
            const response = await api.removeFromCart(productId);
            if (response.success) {
                showNotification('Item removido do carrinho!', 'info');
            }
            return response;
        } catch (error) {
            console.error('Erro ao remover do carrinho:', error);
            showNotification('Erro ao remover do carrinho. Tente novamente.', 'error');
            return { success: false };
        }
    },

    async clearCart() {
        try {
            const response = await api.clearCart();
            if (response.success) {
                showNotification('Carrinho limpo!', 'info');
            }
            return response;
        } catch (error) {
            console.error('Erro ao limpar carrinho:', error);
            showNotification('Erro ao limpar carrinho. Tente novamente.', 'error');
            return { success: false };
        }
    },

    calculateTotal() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
};

// Serviço de Pedidos
const OrderService = {
    async getOrders() {
        try {
            showLoading(true);
            const orders = await api.getOrders();
            showLoading(false);
            return orders;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao buscar pedidos:', error);
            showNotification('Erro ao buscar pedidos. Tente novamente.', 'error');
            return [];
        }
    },

    async getOrderById(orderId) {
        try {
            showLoading(true);
            const order = await api.getOrderById(orderId);
            showLoading(false);
            return order;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao buscar detalhes do pedido:', error);
            showNotification('Erro ao buscar detalhes do pedido. Tente novamente.', 'error');
            return null;
        }
    },

    async createOrder(orderData) {
        try {
            showLoading(true);
            const response = await api.createOrder(orderData);
            showLoading(false);
            
            if (response.success) {
                showNotification('Pedido realizado com sucesso!', 'success');
            }
            
            return response;
        } catch (error) {
            showLoading(false);
            console.error('Erro ao criar pedido:', error);
            showNotification('Erro ao criar pedido. Tente novamente.', 'error');
            return { success: false, message: 'Erro ao criar pedido' };
        }
    }
};

// Exporta os serviços
const Services = {
    auth: AuthService,
    products: ProductService,
    cart: CartService,
    orders: OrderService
};