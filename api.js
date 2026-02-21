// api.js - Simulação de API para o Açucaradas Encomendas

class API {
    constructor() {
        // Inicializa o armazenamento local se não existir
        this.initializeLocalStorage();
    }

    // Inicializa o localStorage com dados padrão se necessário
    initializeLocalStorage() {
        // Usuários
        if (!localStorage.getItem('users')) {
            const defaultUsers = [
                { id: 1, name: 'Administrador', email: 'admin@acucaradas.com', password: '123456', role: 'admin' },
                { id: 2, name: 'Cliente Teste', email: 'cliente@email.com', password: '123456', role: 'customer' }
            ];
            localStorage.setItem('users', JSON.stringify(defaultUsers));
        }

        // Produtos
        if (!localStorage.getItem('products')) {
            const defaultProducts = [
                { id: 'bolo-chocolate', name: 'Bolo de Chocolate', price: 90.00, category: 'bolos', emoji: '🍰', description: 'Delicioso bolo de chocolate com cobertura especial', stock: 10, rating: 5 },
                { id: 'bolo-morango', name: 'Bolo de Morango', price: 85.00, category: 'bolos', emoji: '🍓', description: 'Bolo com recheio e cobertura de morango fresco', stock: 8, rating: 5 },
                { id: 'brigadeiro', name: 'Brigadeiro Gourmet', price: 3.50, category: 'doces', emoji: '🍫', description: 'Brigadeiro gourmet com chocolate belga', stock: 50, rating: 5 },
                { id: 'beijinho', name: 'Beijinho', price: 3.00, category: 'doces', emoji: '🥥', description: 'Beijinho de coco com cravinho', stock: 50, rating: 5 },
                { id: 'coxinha', name: 'Coxinha', price: 8.00, category: 'salgados', emoji: '🥟', description: 'Coxinha de frango com catupiry', stock: 20, rating: 5 },
                { id: 'suco-natural', name: 'Suco Natural', price: 12.00, category: 'bebidas', emoji: '🧃', description: 'Suco natural de frutas da estação', stock: 15, rating: 5 },
                { id: 'cupcake-red-velvet', name: 'Cupcake Red Velvet', price: 12.50, category: 'doces', emoji: '🧁', description: 'Cupcake red velvet com cream cheese', stock: 15, rating: 5 },
                { id: 'torta-limao', name: 'Torta de Limão', price: 75.00, category: 'bolos', emoji: '🥧', description: 'Torta de limão com merengue', stock: 5, rating: 5 }
            ];
            localStorage.setItem('products', JSON.stringify(defaultProducts));
        }

        // Pedidos
        if (!localStorage.getItem('orders')) {
            const defaultOrders = [
                {
                    id: 'PED001',
                    customer: {
                        name: 'Maria Silva',
                        email: 'maria@email.com',
                        phone: '(11) 98765-4321',
                        address: 'Rua das Flores, 123'
                    },
                    items: [
                        { id: 'bolo-chocolate', name: 'Bolo de Chocolate', price: 90.00, quantity: 1 },
                        { id: 'brigadeiro', name: 'Brigadeiro Gourmet', price: 3.50, quantity: 20 }
                    ],
                    total: 160.00,
                    status: 'in-progress',
                    date: '2024-03-31T10:30:00',
                    notes: 'Entregar no período da tarde'
                },
                {
                    id: 'PED002',
                    customer: {
                        name: 'João Santos',
                        email: 'joao@email.com',
                        phone: '(11) 91234-5678',
                        address: 'Av. Principal, 456'
                    },
                    items: [
                        { id: 'bolo-morango', name: 'Bolo de Morango', price: 85.00, quantity: 2 },
                        { id: 'suco-natural', name: 'Suco Natural', price: 12.00, quantity: 2 },
                        { id: 'coxinha', name: 'Coxinha', price: 8.00, quantity: 5 }
                    ],
                    total: 214.00,
                    status: 'completed',
                    date: '2024-03-30T14:45:00',
                    notes: ''
                }
            ];
            localStorage.setItem('orders', JSON.stringify(defaultOrders));
        }

        // Carrinho
        if (!localStorage.getItem('cart')) {
            localStorage.setItem('cart', JSON.stringify([]));
        }

        // Usuário atual
        if (!localStorage.getItem('currentUser')) {
            localStorage.setItem('currentUser', JSON.stringify(null));
        }
    }

    // Autenticação
    async login(email, password) {
        // Simula um delay de rede
        await this.delay(800);
        
        const users = JSON.parse(localStorage.getItem('users'));
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            // Remove a senha antes de armazenar o usuário atual
            const { password, ...userWithoutPassword } = user;
            localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
            return { success: true, user: userWithoutPassword };
        } else {
            return { success: false, message: 'Email ou senha incorretos' };
        }
    }

    async logout() {
        await this.delay(300);
        localStorage.setItem('currentUser', JSON.stringify(null));
        return { success: true };
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser'));
    }

    // Produtos
    async getProducts() {
        await this.delay(500);
        return JSON.parse(localStorage.getItem('products'));
    }

    async getProductById(id) {
        await this.delay(300);
        const products = JSON.parse(localStorage.getItem('products'));
        return products.find(p => p.id === id);
    }

    async getProductsByCategory(category) {
        await this.delay(300);
        const products = JSON.parse(localStorage.getItem('products'));
        return category === 'all' ? products : products.filter(p => p.category === category);
    }

    async searchProducts(query) {
        await this.delay(300);
        const products = JSON.parse(localStorage.getItem('products'));
        const searchTerm = query.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.description.toLowerCase().includes(searchTerm)
        );
    }

    // Carrinho
    getCart() {
        return JSON.parse(localStorage.getItem('cart'));
    }

    async addToCart(product, quantity = 1) {
        await this.delay(300);
        const cart = this.getCart();
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                emoji: product.emoji,
                quantity: quantity
            });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        return { success: true, cart };
    }

    async updateCartItemQuantity(productId, quantity) {
        await this.delay(200);
        const cart = this.getCart();
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            item.quantity = quantity;
            if (item.quantity <= 0) {
                return this.removeFromCart(productId);
            }
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        return { success: true, cart };
    }

    async removeFromCart(productId) {
        await this.delay(200);
        let cart = this.getCart();
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        return { success: true, cart };
    }

    async clearCart() {
        await this.delay(200);
        localStorage.setItem('cart', JSON.stringify([]));
        return { success: true, cart: [] };
    }

    // Pedidos
    async getOrders() {
        await this.delay(700);
        return JSON.parse(localStorage.getItem('orders'));
    }

    async getOrderById(id) {
        await this.delay(500);
        const orders = JSON.parse(localStorage.getItem('orders'));
        return orders.find(o => o.id === id);
    }

    async createOrder(orderData) {
        await this.delay(1500);
        const orders = JSON.parse(localStorage.getItem('orders'));
        
        // Gera um ID único para o pedido
        const orderId = 'PED' + Date.now().toString().slice(-6);
        
        const newOrder = {
            id: orderId,
            ...orderData,
            date: new Date().toISOString(),
            status: 'pending'
        };
        
        orders.push(newOrder);
        localStorage.setItem('orders', JSON.stringify(orders));
        
        // Limpa o carrinho após criar o pedido
        await this.clearCart();
        
        return { success: true, order: newOrder };
    }

    async updateOrderStatus(orderId, status) {
        await this.delay(500);
        const orders = JSON.parse(localStorage.getItem('orders'));
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
            order.status = status;
            localStorage.setItem('orders', JSON.stringify(orders));
            return { success: true, order };
        }
        
        return { success: false, message: 'Pedido não encontrado' };
    }

    // Utilitários
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exporta a instância da API
const api = new API();