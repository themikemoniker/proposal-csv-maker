const store = {
    data: { products: [], clients: [], cart: [] },
  
    save() {
      localStorage.setItem('invoiceAppData', JSON.stringify(this.data));
    },
  
    loadFromLocal() {
      const saved = localStorage.getItem('invoiceAppData');
      if (saved) {
        this.data = JSON.parse(saved);
      }
    },
  
    loadFromFile(fileContent) {
      const parsed = JSON.parse(fileContent);
      this.data.products = parsed.products || [];
      this.data.clients = parsed.clients || [];
      this.data.cart = [];
      this.save();
    },
  
    exportSeedData() {
      const blob = new Blob([JSON.stringify({ products: this.data.products, clients: this.data.clients }, null, 2)], {
        type: 'application/json'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'catalogue.json';
      link.click();
    },
  
    addToCart(productId, quantity) {
      const product = this.data.products.find(p => p.id === productId);
      if (!product) return;
      const existing = this.data.cart.find(c => c.id === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        this.data.cart.push({ ...product, quantity });
      }
      this.save();
    },
  
    updateCartQuantity(productId, quantity) {
      if (quantity <= 0) {
        this.data.cart = this.data.cart.filter(i => i.id !== productId);
      } else {
        const item = this.data.cart.find(i => i.id === productId);
        if (item) item.quantity = quantity;
      }
      this.save();
    },
  
    removeProduct(id) {
      this.data.products = this.data.products.filter(p => p.id !== id);
      this.data.cart = this.data.cart.filter(c => c.id !== id);
      this.save();
    },
  
    exportCSV(company) {
      const rows = [
        [`Company: ${company.name}, ${company.address}`],
        [],
        ['Product', 'Category', 'Qty', 'Unit Price', 'Subtotal']
      ];
  
      let subtotal = 0;
      this.data.cart.forEach(item => {
        const rowSubtotal = item.price * item.quantity;
        subtotal += rowSubtotal;
        rows.push([item.name, item.category, item.quantity, item.price.toFixed(2), rowSubtotal.toFixed(2)]);
      });
  
      const iva = subtotal * 0.16;
      const total = subtotal + iva;
  
      rows.push([], ['Subtotal', '', '', '', subtotal.toFixed(2)]);
      rows.push(['IVA 16%', '', '', '', iva.toFixed(2)]);
      rows.push(['Total', '', '', '', total.toFixed(2)]);
  
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "invoice.csv";
      link.click();
    }
  };
  
  function renderCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    const categories = Array.from(new Set(store.data.products.map(p => p.category)));
    select.innerHTML = `<option value="">All Categories</option>` +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  }
  
  function renderProducts() {
    const list = document.getElementById('productList');
    const filter = document.getElementById('categoryFilter').value;
    const sortBy = document.getElementById('sortBy').value;
  
    let products = [...store.data.products];
    if (filter) products = products.filter(p => p.category === filter);
    if (sortBy === 'name') products.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'price') products.sort((a, b) => a.price - b.price);
  
    list.innerHTML = '';
    products.forEach(p => {
      const li = document.createElement('li');
      li.className = "border p-4 rounded";
  
      li.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="flex-1">
            <strong>${p.name}</strong> <span class="text-gray-600">(${p.category})</span><br>
            $<input type="number" value="${p.price}" min="0" step="0.01" class="border px-1 w-20" onchange="updatePrice(${p.id}, this.value)">
          </div>
          <div>
            <input type="number" min="1" value="1" id="qty-${p.id}" class="border w-16 mr-2 p-1">
            <button class="bg-blue-500 text-white px-2 py-1" onclick="addToCart(${p.id})">Add</button>
            <button class="text-red-500 ml-2" onclick="removeProduct(${p.id})">❌</button>
          </div>
        </div>
      `;
      list.appendChild(li);
    });
  }
  
  function renderCart() {
    const list = document.getElementById('cartList');
    list.innerHTML = '';
    let subtotal = 0;
  
    store.data.cart.forEach(item => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;
  
      const li = document.createElement('li');
      li.className = 'flex justify-between items-center';
  
      li.innerHTML = `
        <span>${item.name}</span>
        <div>
          <input type="number" value="${item.quantity}" min="0" class="border w-16 text-center" onchange="updateCart(${item.id}, this.value)">
          <button class="text-red-500 ml-2" onclick="updateCart(${item.id}, 0)">❌</button>
        </div>
      `;
      list.appendChild(li);
    });
  
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
  
    document.getElementById('cartSubtotal').textContent = `Subtotal: $${subtotal.toFixed(2)}`;
    document.getElementById('cartTotal').textContent = `Total (IVA 16%): $${total.toFixed(2)}`;
  }
  
  // File & Button Bindings
  document.getElementById('loadCatalogue').addEventListener('click', () => {
    document.getElementById('catalogueFileInput').click();
  });
  
  document.getElementById('catalogueFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.loadFromFile(reader.result);
      renderProducts();
      renderCategoryFilter();
      renderCart();
    };
    reader.readAsText(file);
  });
  
  document.getElementById('saveCatalogue').addEventListener('click', () => {
    store.exportSeedData();
  });
  
  document.getElementById('exportCSV').addEventListener('click', () => {
    const company = {
      name: document.getElementById('companyName').value,
      address: document.getElementById('companyAddress').value
    };
    store.exportCSV(company);
  });
  
  document.getElementById('categoryFilter').addEventListener('change', renderProducts);
  document.getElementById('sortBy').addEventListener('change', renderProducts);
  
  // Button Handlers
  function addToCart(productId) {
    const qty = parseInt(document.getElementById(`qty-${productId}`).value) || 1;
    store.addToCart(productId, qty);
    renderCart();
  }
  
  function updateCart(productId, qty) {
    store.updateCartQuantity(productId, parseInt(qty));
    renderCart();
  }
  
  function removeProduct(id) {
    store.removeProduct(id);
    renderProducts();
    renderCart();
  }
  
  function updatePrice(id, newPrice) {
    const product = store.data.products.find(p => p.id === id);
    if (product) {
      product.price = parseFloat(newPrice);
      store.save();
      renderCart();
    }
  }
  
  // New Product Form Handler
  document.getElementById('newProductForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('newName').value.trim();
    const category = document.getElementById('newCategory').value.trim();
    const price = parseFloat(document.getElementById('newPrice').value);
    const imageFile = document.getElementById('newImage').files[0];
  
    let base64 = "";
    if (imageFile) {
      base64 = await toBase64(imageFile);
    }
  
    const newProduct = {
      id: Date.now(),
      name,
      category,
      price,
      image: base64
    };
  
    store.data.products.push(newProduct);
    store.save();
    renderProducts();
    renderCategoryFilter();
    e.target.reset();
  });
  
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  }
  
  // Init
  (() => {
    store.loadFromLocal();
    renderProducts();
    renderCategoryFilter();
    renderCart();
  })();
  