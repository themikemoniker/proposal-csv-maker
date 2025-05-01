const store = {
    data: { products: [], clients: [], companies: [], cart: [] },
  
    save() {
      localStorage.setItem('invoiceAppData', JSON.stringify(this.data));
    },
  
    loadFromLocal() {
      const saved = localStorage.getItem('invoiceAppData');
      if (saved) this.data = JSON.parse(saved);
    },
  
    loadFromFile(fileContent) {
      const parsed = JSON.parse(fileContent);
      this.data.products = parsed.products || [];
      this.data.clients = parsed.clients || [];
      this.data.companies = parsed.companies || [];
      this.data.cart = [];
      this.save();
    },
  
    exportSeedData() {
      const blob = new Blob([JSON.stringify({
        products: this.data.products,
        clients: this.data.clients,
        companies: this.data.companies
      }, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'catalogue.json';
      link.click();
    }
  };
  
  // --- GLOBAL FUNCTIONS FOR HTML ONCLICK ---
  window.addToCart = function(id) {
    const qty = parseInt(document.getElementById(`qty-${id}`).value) || 1;
    const p = store.data.products.find(p => p.id === id);
    if (!p) return;
    const existing = store.data.cart.find(c => c.id === id);
    if (existing) existing.quantity += qty;
    else store.data.cart.push({ ...p, quantity: qty });
    store.save();
    renderCart();
  };
  
  window.updateCart = function(id, qty) {
    store.data.cart = store.data.cart.map(c => c.id === id ? { ...c, quantity: parseInt(qty) } : c).filter(c => c.quantity > 0);
    store.save();
    renderCart();
  };
  
  window.removeProduct = function(id) {
    store.data.products = store.data.products.filter(p => p.id !== id);
    store.data.cart = store.data.cart.filter(c => c.id !== id);
    store.save();
    renderProducts();
    renderCart();
  };
  
  window.updatePrice = function(id, newPrice) {
    const p = store.data.products.find(p => p.id === id);
    if (p) {
      p.price = parseFloat(newPrice);
      store.save();
      renderCart();
    }
  };
  
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  function renderCompanySelect() {
    const select = document.getElementById('companySelect');
    select.innerHTML = store.data.companies.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  }
  
  function renderClientSelect() {
    const select = document.getElementById('clientSelect');
    select.innerHTML = '<option value="">-- Choose Client --</option>' +
      store.data.clients.map(c => `<option value="${c.id}">${c.name} (${c.email})</option>`).join('');
  }
  
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
      li.className = "border p-4 rounded flex gap-4 items-center";
  
      li.innerHTML = `
        <img src="${p.image || ''}" alt="${p.name}" class="w-12 h-12 object-cover border" />
        <div class="flex-1">
          <strong>${p.name}</strong> <span class="text-gray-600">(${p.category})</span><br>
          $<input type="number" value="${p.price}" min="0" step="0.01" class="border px-1 w-20" onchange="updatePrice(${p.id}, this.value)">
        </div>
        <div>
          <input type="number" min="1" value="1" id="qty-${p.id}" class="border w-16 mr-2 p-1">
          <button class="bg-blue-500 text-white px-2 py-1" onclick="addToCart(${p.id})">Add</button>
          <button class="text-red-500 ml-2" onclick="removeProduct(${p.id})">❌</button>
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
      const total = item.price * item.quantity;
      subtotal += total;
  
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
    renderProposalPreview();
  }
  
  function renderProposalPreview() {
    const companyId = document.getElementById('companySelect').value;
    const company = store.data.companies.find(c => c.id == companyId);
    const clientId = document.getElementById('clientSelect').value;
    const client = store.data.clients.find(c => c.id == clientId);
    const date = document.getElementById('invoiceDate').value;
    const number = document.getElementById('invoiceNumber').value;
  
    let html = '';
  
    if (company) {
      html += `<p><strong>Company:</strong> ${company.name}, ${company.address}</p>`;
      if (company.logo) {
        html += `<p><img src="${company.logo}" style="max-height:60px;"></p>`;
      }
    }
    if (client) {
      html += `<p><strong>Client:</strong> ${client.name} (${client.email})</p>`;
    }
    if (date) html += `<p><strong>Date:</strong> ${date}</p>`;
    if (number) html += `<p><strong>Invoice #:</strong> ${number}</p>`;
  
    html += `<table class="mt-2 w-full text-sm"><thead>
      <tr><th>Image</th><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
    </thead><tbody>`;
  
    let subtotal = 0;
    store.data.cart.forEach(item => {
      const total = item.price * item.quantity;
      subtotal += total;
      html += `<tr>
        <td><img src="${item.image}" class="w-12 h-12 object-cover"/></td>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${total.toFixed(2)}</td>
      </tr>`;
    });
  
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
  
    html += `</tbody></table>
      <p><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
      <p><strong>IVA (16%):</strong> $${iva.toFixed(2)}</p>
      <p><strong>Total:</strong> $${total.toFixed(2)}</p>`;
  
    document.getElementById('proposalPreview').innerHTML = html;
  }
  
  function printProposal() {
    const content = document.getElementById('proposalPreview').innerHTML;
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`
      <html><head><title>Invoice</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px; }
        img { max-height: 60px; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }
  
  function downloadPDF() {
    const element = document.getElementById('proposalPreview');
    const opt = {
      margin: 0.5,
      filename: 'invoice.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }
  
  // Init
  (() => {
    store.loadFromLocal();
    renderCompanySelect();
    renderClientSelect();
    renderProducts();
    renderCategoryFilter();
    renderCart();
    document.getElementById('invoiceDate').valueAsDate = new Date();
  
    // Live preview update
    document.getElementById('companySelect').addEventListener('change', renderProposalPreview);
    document.getElementById('clientSelect').addEventListener('change', renderProposalPreview);
    document.getElementById('invoiceDate').addEventListener('input', renderProposalPreview);
    document.getElementById('invoiceNumber').addEventListener('input', renderProposalPreview);
  
    // Catalogue buttons
    document.getElementById('loadCatalogue').addEventListener('click', () =>
      document.getElementById('catalogueFileInput').click()
    );
  
    document.getElementById('catalogueFileInput').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        store.loadFromFile(reader.result);
        renderCompanySelect();
        renderClientSelect();
        renderProducts();
        renderCategoryFilter();
        renderCart();
        document.getElementById('invoiceDate').valueAsDate = new Date();
      };
      reader.readAsText(file);
    });
  
    document.getElementById('saveCatalogue').addEventListener('click', () => store.exportSeedData());
  
    document.getElementById('sortBy').addEventListener('change', renderProducts);
    document.getElementById('categoryFilter').addEventListener('change', renderProducts);
  
    // Product form
    document.getElementById('newProductForm').addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('newName').value.trim();
      const category = document.getElementById('newCategory').value.trim();
      const price = parseFloat(document.getElementById('newPrice').value);
      const imageFile = document.getElementById('newImage').files[0];
      const image = imageFile ? await toBase64(imageFile) : "";
      store.data.products.push({ id: Date.now(), name, category, price, image });
      store.save();
      renderProducts();
      renderCategoryFilter();
      e.target.reset();
    });
  
    // Client form
    document.getElementById('newClientForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('newClientName').value.trim();
      const email = document.getElementById('newClientEmail').value.trim();
      const id = Date.now();
      store.data.clients.push({ id, name, email });
      store.save();
      renderClientSelect();
      document.getElementById('clientSelect').value = id;
      renderProposalPreview();
      e.target.reset();
    });
  
    // Company form
    document.getElementById('newCompanyForm').addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('newCompanyName').value.trim();
      const address = document.getElementById('newCompanyAddress').value.trim();
      const logoFile = document.getElementById('newCompanyLogo').files[0];
      const logo = logoFile ? await toBase64(logoFile) : "";
      const id = Date.now();
      store.data.companies.push({ id, name, address, logo });
      store.save();
      renderCompanySelect();
      document.getElementById('companySelect').value = id;
      renderProposalPreview();
      e.target.reset();
    });
  })();
  