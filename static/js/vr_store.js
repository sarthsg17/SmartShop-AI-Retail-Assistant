import * as THREE from './three.module.js';
import { PointerLockControls } from './PointerLockControls.js';
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 12, 20); // Start at human eye level
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// First-person controls
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

// Pointer lock instructions
const instructions = document.createElement('div');
instructions.style.position = 'fixed';
instructions.style.top = '20px';
instructions.style.left = '50%';
instructions.style.transform = 'translateX(-50%)';
instructions.style.background = 'rgba(255,255,255,0.95)';
instructions.style.padding = '12px 24px';
instructions.style.borderRadius = '10px';
instructions.style.fontSize = '1.1rem';
instructions.style.color = '#444';
instructions.style.zIndex = '2000';
instructions.innerHTML = 'Click to enter the store. Use <b>WASD</b> or <b>arrow keys</b> to move, mouse to look around.<br>Press <b>Esc</b> to unlock and click a product to inspect.';
document.body.appendChild(instructions);
canvas.addEventListener('click', () => {
  if (!controls.isLocked) controls.lock();
// Enable mouse wheel zoom for camera
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camera.position.z += e.deltaY * 0.05;
  camera.position.z = Math.max(8, Math.min(60, camera.position.z));
});
});
controls.addEventListener('lock', () => { instructions.style.display = 'none'; });
controls.addEventListener('unlock', () => { instructions.style.display = 'block'; });

// Pastel color palette
// Commercial store color palette
const storeFloor = 0xf5f5dc;      // Beige floor
const storeWall = 0xfaf9f6;       // Off-white walls
const storeAccent = 0xf5f5dc;     // Beige accent (for highlights)
const storeShelf = 0xd2b48c;      // Light tan wood tone
const storeEdge = 0x8b7b6b;       // Warm brown metallic edge
const storeLabel = 0xfaf9f6;      // Off-white for labels
const storeShadow = 0xe0d8c3;     // Soft beige shadow

// Floor (pastel, no black)
const floorSize = 160;
const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
const floorMaterial = new THREE.MeshStandardMaterial({ color: storeFloor });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// Walls (pastel)
const wallMaterial = new THREE.MeshStandardMaterial({ color: storeWall, side: THREE.BackSide });
const room = new THREE.Mesh(
  new THREE.BoxGeometry(floorSize, 50, floorSize),
  wallMaterial
);
room.position.y = 25;
scene.add(room);
// Accent wall (beige highlight)
const accentWall = new THREE.Mesh(
  new THREE.PlaneGeometry(floorSize, 50),
  new THREE.MeshStandardMaterial({ color: storeAccent, side: THREE.DoubleSide })
);
accentWall.position.set(0, 25, -floorSize / 2 + 0.1);
scene.add(accentWall);

// Ceiling lights (soft, pastel)
for (let i = -3; i <= 3; i++) {
  const light = new THREE.PointLight(0xffffff, 0.5, 200);
  light.position.set(i * 32, 48, 0);
  scene.add(light);
}

// Shelves (pastel)
const shelfMaterial = new THREE.MeshStandardMaterial({ color: storeShelf });
const shelfEdgeMaterial = new THREE.MeshStandardMaterial({ color: storeEdge });
const shelfWidth = 60, shelfHeight = 2.5, shelfDepth = 10;
const shelfLevels = 6;
const shelfRows = 3;
const shelfSpacingY = 7;
const shelfSpacingZ = 30;
const shelfCategoryNames = ['Cosmetics', 'Electronics', 'Books', 'Fruits', 'Footwear'];
for (let row = 0; row < shelfRows; row++) {
  for (let level = 0; level < shelfLevels; level++) {
    // Main shelf
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(shelfWidth, shelfHeight, shelfDepth),
      shelfMaterial
    );
    shelf.position.set(0, 4 + level * shelfSpacingY, -40 + row * shelfSpacingZ); // Raise shelves for human view
    scene.add(shelf);
    // Pastel edge
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(shelfWidth, 0.5, 1.2),
      shelfEdgeMaterial
    );
    edge.position.set(0, 5.5 + level * shelfSpacingY, -35.5 + row * shelfSpacingZ);
    scene.add(edge);
    // Add shelf category label above the first shelf in each row
    if (level === 0) {
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 220;
      labelCanvas.height = 48;
      const labelCtx = labelCanvas.getContext('2d');
      labelCtx.fillStyle = '#faf9f6';
      labelCtx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      labelCtx.fillStyle = '#8b7b6b';
      labelCtx.font = 'bold 22px Arial';
      labelCtx.textAlign = 'center';
      labelCtx.fillText(shelfCategoryNames[row % shelfCategoryNames.length], labelCanvas.width / 2, 32);
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture }));
      labelSprite.scale.set(14, 3, 1);
      labelSprite.position.set(0, 10 + level * shelfSpacingY, -40 + row * shelfSpacingZ);
      scene.add(labelSprite);
    }
  }
}

let productMeshes = [];
let productData = [];

// ✅ Load product data
fetch("/api/products")
  .then(res => res.json())
  .then(products => {
    const loader = new THREE.TextureLoader();
    productData = products;

    // Place products on shelves (fill all spots, pastel, with shadow)
    const productsPerShelf = 14; // More products per shelf
    const shelfStartX = -39; // Wider shelves for more products
    const productSpacingX = 6.5;
    let productIndex = 0;
    // Categorized shelves: cosmetics, electronics, books, fruits, footwear
    const cosmetics = [
      { title: 'Lipstick Set', price: 599, thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80', description: 'Matte finish, 5 vibrant shades, long-lasting.' },
      { title: 'Perfume', price: 999, thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=256&q=80', description: 'Fresh floral scent, 100ml bottle.' },
      { title: 'Face Cream', price: 399, thumbnail: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=256&q=80', description: 'Moisturizing, SPF 15, suitable for all skin types.' },
      { title: 'Makeup Kit', price: 1799, thumbnail: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=256&q=80', description: 'All-in-one, 12 shades, travel pouch.' },
      { title: 'Shampoo', price: 299, thumbnail: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=256&q=80', description: 'Anti-dandruff, 400ml, fresh scent.' },
      { title: 'Cosmetic Pouch', price: 299, thumbnail: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=256&q=80', description: 'Compact, waterproof, zipper closure.' }
    ];
    const electronics = [
      { title: 'Bluetooth Headphones', price: 2499, thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80', description: 'Wireless, noise-cancelling, 20h battery life.' },
      { title: 'Smart Watch', price: 3499, thumbnail: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=256&q=80', description: 'Fitness tracking, notifications, water-resistant.' },
      { title: 'Tablet', price: 5999, thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=256&q=80', description: '10-inch display, 32GB storage, WiFi.' },
      { title: 'Wireless Mouse', price: 599, thumbnail: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=256&q=80', description: 'Ergonomic, 2.4GHz, 1600 DPI.' },
      { title: 'Bluetooth Speaker', price: 1299, thumbnail: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=256&q=80', description: 'Portable, 10h playtime, waterproof.' },
      { title: 'Gaming Keyboard', price: 1999, thumbnail: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=256&q=80', description: 'RGB backlight, mechanical keys, anti-ghosting.' },
      { title: 'Wireless Charger', price: 899, thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=256&q=80', description: 'Fast charge, universal compatibility.' },
      { title: 'Mobile Phone', price: 8999, thumbnail: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=256&q=80', description: '6.5-inch, dual camera, 64GB storage.' }
    ];
    const books = [
      { title: 'The Great Gatsby', price: 299, thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=256&q=80', description: 'Classic novel by F. Scott Fitzgerald.' },
      { title: 'Atomic Habits', price: 499, thumbnail: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=256&q=80', description: 'Self-improvement by James Clear.' },
      { title: 'Harry Potter', price: 399, thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=256&q=80', description: 'Fantasy novel by J.K. Rowling.' },
      { title: 'Rich Dad Poor Dad', price: 350, thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80', description: 'Finance by Robert Kiyosaki.' },
      { title: 'Wings of Fire', price: 299, thumbnail: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=256&q=80', description: 'Autobiography by A.P.J. Abdul Kalam.' },
      { title: 'The Alchemist', price: 349, thumbnail: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=256&q=80', description: 'Novel by Paulo Coelho.' }
    ];
    const fruits = [
      { title: 'Apple', price: 120, thumbnail: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=256&q=80', description: 'Fresh red apples, 1kg.' },
      { title: 'Banana', price: 60, thumbnail: 'https://images.unsplash.com/photo-1574226516831-e1dff420e8e7?auto=format&fit=crop&w=256&q=80', description: 'Ripe bananas, 1 dozen.' },
      { title: 'Orange', price: 80, thumbnail: 'https://images.unsplash.com/photo-1464306076886-debede6bbf09?auto=format&fit=crop&w=256&q=80', description: 'Juicy oranges, 1kg.' },
      { title: 'Grapes', price: 90, thumbnail: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=256&q=80', description: 'Seedless grapes, 500g.' },
      { title: 'Strawberry', price: 150, thumbnail: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=256&q=80', description: 'Fresh strawberries, 250g.' },
      { title: 'Watermelon', price: 200, thumbnail: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=256&q=80', description: 'Sweet watermelon, 1pc.' }
    ];
    const footwear = [
      { title: 'Sneakers', price: 1599, thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80', description: 'Breathable mesh, lightweight, unisex.' },
      { title: "Men's Shoes", price: 1799, thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80', description: 'Casual, lace-up, lightweight.' },
      { title: "Women's Sandals", price: 899, thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=256&q=80', description: 'Comfortable, slip-on, summer style.' },
      { title: 'Sports Shoes', price: 1299, thumbnail: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=256&q=80', description: 'Running shoes, lightweight.' },
      { title: 'Flip Flops', price: 299, thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=256&q=80', description: 'Casual flip flops, waterproof.' },
      { title: 'Formal Shoes', price: 1999, thumbnail: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=256&q=80', description: 'Leather formal shoes.' }
    ];
    // Assign shelves to categories
    const shelfCategories = [cosmetics, cosmetics, electronics, electronics, books, books, fruits, fruits, footwear, footwear];
    const totalSpots = productsPerShelf * shelfLevels * shelfRows;
    let productList = [];
    for (let shelfIdx = 0; shelfIdx < shelfLevels; shelfIdx++) {
      let catProducts = shelfCategories[shelfIdx % shelfCategories.length];
      for (let i = 0; i < productsPerShelf * shelfRows; i++) {
        productList.push(catProducts[i % catProducts.length]);
      }
    }
    products = productList;
    for (let row = 0; row < shelfRows; row++) {
      for (let level = 0; level < shelfLevels; level++) {
        for (let i = 0; i < productsPerShelf; i++) {
          let p = products[productIndex] || null;
          const x = shelfStartX + i * productSpacingX;
          // Shelf Y position
          const shelfY = 4 + level * shelfSpacingY;
          // Product height (default to 4.5, scale up if mesh.scale used)
          let productHeight = 4.5 * 1.25; // 1.25 is the scale factor used above
          // If you use different geometry, you may want to adjust this
          // Place product so its bottom sits exactly on shelf
          const y = shelfY + productHeight / 2;
          const z = -40 + row * shelfSpacingZ;
          let mesh, mat;
          if (p) {
            // Choose geometry and material based on category
            let category = '';
            if (cosmetics.some(item => item.title === p.title)) category = 'cosmetics';
            else if (electronics.some(item => item.title === p.title)) category = 'electronics';
            else if (books.some(item => item.title === p.title)) category = 'books';
            else if (fruits.some(item => item.title === p.title)) category = 'fruits';
            else if (footwear.some(item => item.title === p.title)) category = 'footwear';

            // --- Realistic shapes by product title ---
            // Cosmetics
            if (p.title.toLowerCase().includes('lipstick')) {
              // Lipstick: thin cylinder with cap
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.25, metalness: 0.5, clearcoat: 0.7 });
              mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3.2, 32), mat);
              // Cap (smaller cylinder)
              const capMat = new THREE.MeshPhysicalMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.8 });
              const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.1, 32), capMat);
              cap.position.y = 2.15;
              mesh.add(cap);
            } else if (p.title.toLowerCase().includes('perfume')) {
              // Perfume: sphere bottle
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.18, metalness: 0.6, reflectivity: 0.7 });
              mesh = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), mat);
              // Cap
              const capMat = new THREE.MeshPhysicalMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.9 });
              const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), capMat);
              cap.position.y = 1.5;
              mesh.add(cap);
            } else if (p.title.toLowerCase().includes('cream') || p.title.toLowerCase().includes('makeup') || p.title.toLowerCase().includes('shampoo')) {
              // Jar or bottle
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.3, metalness: 0.2 });
              mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 32), mat);
            } else if (p.title.toLowerCase().includes('pouch')) {
              // Cosmetic pouch: rounded box
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.4, metalness: 0.1 });
              mesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.2), mat);
            }
            // Electronics
            else if (p.title.toLowerCase().includes('headphones')) {
              // Headphones: two torus for earcups, cylinder for band
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.2, metalness: 0.7 });
              mesh = new THREE.Group();
              const ear1 = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.25, 16, 32), mat);
              ear1.position.set(-0.8, 0, 0);
              mesh.add(ear1);
              const ear2 = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.25, 16, 32), mat);
              ear2.position.set(0.8, 0, 0);
              mesh.add(ear2);
              const bandMat = new THREE.MeshPhysicalMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.8 });
              const band = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 16, 32, Math.PI), bandMat);
              band.position.y = 0.7;
              mesh.add(band);
            } else if (p.title.toLowerCase().includes('watch')) {
              // Smart watch: thin rounded box
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.18, metalness: 0.5 });
              mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.3), mat);
            } else if (p.title.toLowerCase().includes('tablet') || p.title.toLowerCase().includes('mobile')) {
              // Tablet/mobile: thin rounded box
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.18, metalness: 0.5 });
              mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), mat);
            } else if (p.title.toLowerCase().includes('mouse')) {
              // Mouse: ellipsoid
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.18, metalness: 0.5 });
              mesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), mat);
              mesh.scale.set(1.2, 0.7, 1.7);
            } else if (p.title.toLowerCase().includes('speaker')) {
              // Speaker: cylinder
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.18, metalness: 0.5 });
              mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 32), mat);
            } else if (p.title.toLowerCase().includes('keyboard')) {
              // Keyboard: flat wide box
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.18, metalness: 0.5 });
              mesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 1.2), mat);
            } else if (p.title.toLowerCase().includes('charger')) {
              // Charger: small rounded box
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.18, metalness: 0.5 });
              mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat);
            }
            // Books
            else if (category === 'books') {
              mat = new THREE.MeshStandardMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.8, metalness: 0.05 });
              mesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 4.2, 0.5), mat);
            }
            // Fruits
            else if (p.title.toLowerCase().includes('apple') || p.title.toLowerCase().includes('orange') || p.title.toLowerCase().includes('grapes') || p.title.toLowerCase().includes('watermelon')) {
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.25, metalness: 0.1 });
              if (p.title.toLowerCase().includes('grapes')) {
                // Grapes: bunch of small spheres
                mesh = new THREE.Group();
                for (let gx = -0.5; gx <= 0.5; gx += 0.5) {
                  for (let gy = -0.5; gy <= 0.5; gy += 0.5) {
                    const grape = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), mat);
                    grape.position.set(gx, gy, 0);
                    mesh.add(grape);
                  }
                }
              } else if (p.title.toLowerCase().includes('watermelon')) {
                mesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), mat);
              } else {
                mesh = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 32), mat);
              }
            } else if (p.title.toLowerCase().includes('banana')) {
              // Banana: curved cylinder
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffff99, roughness: 0.3, metalness: 0.1 });
              mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 2.2, 32), mat);
              mesh.rotation.z = Math.PI / 4;
            } else if (p.title.toLowerCase().includes('strawberry')) {
              // Strawberry: cone
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xff4f4f, roughness: 0.3, metalness: 0.1 });
              mesh = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 32), mat);
            }
            // Footwear
            else if (p.title.toLowerCase().includes('sneaker') || p.title.toLowerCase().includes('shoe') || p.title.toLowerCase().includes('sandals') || p.title.toLowerCase().includes('flip flops') || p.title.toLowerCase().includes('formal')) {
              // Shoe: elongated ellipsoid
              mat = new THREE.MeshPhysicalMaterial({ map: loader.load(p.thumbnail), color: 0xffffff, roughness: 0.35, metalness: 0.2 });
              mesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), mat);
              mesh.scale.set(2.2, 0.7, 1.1);
            } else {
              // Default: box
              mat = new THREE.MeshStandardMaterial({ map: loader.load(p.thumbnail), color: 0xffffff });
              mesh = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.5, 4.5), mat);
            }
          } else {
            mat = new THREE.MeshStandardMaterial({ color: 0xfff1e6, opacity: 0.7, transparent: true });
            mesh = new THREE.Mesh(
              new THREE.BoxGeometry(5.5, 5.5, 5.5),
              mat
            );
          }
          mesh.position.set(x, y, z); // Product sits exactly on shelf
          mesh.castShadow = true;
          mesh.receiveShadow = false;
          if (p) {
            mesh.userData = { product: p, index: productIndex };
            productMeshes.push(mesh);
          }
          scene.add(mesh);

          // Shadow (soft circle under product)
          const shadowCanvas = document.createElement('canvas');
          shadowCanvas.width = 64;
          shadowCanvas.height = 64;
          const sctx = shadowCanvas.getContext('2d');
          sctx.beginPath();
          sctx.arc(32, 32, 28, 0, 2 * Math.PI);
          sctx.closePath();
          sctx.fillStyle = 'rgba(170,170,170,0.18)';
          sctx.shadowColor = '#888';
          sctx.shadowBlur = 12;
          sctx.fill();
          const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
          const shadowMat = new THREE.SpriteMaterial({ map: shadowTexture, transparent: true });
          const shadow = new THREE.Sprite(shadowMat);
          shadow.scale.set(5, 2, 1);
          shadow.position.set(x, y + 0.2, z);
          scene.add(shadow);

          // Label (pastel, always visible, price and name)
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 54;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#faf9f6';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#8b7b6b';
          ctx.font = 'bold 16px Arial';
          if (p) {
            ctx.fillText(p.title.substring(0, 18), 10, 22);
            ctx.fillStyle = '#d2b48c';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('₹' + (p.price * 85), 10, 44);
          } else {
            ctx.fillStyle = '#bbb';
            ctx.font = 'italic 16px Arial';
            ctx.fillText('Coming Soon', 10, 32);
          }
          const texture = new THREE.CanvasTexture(canvas);
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
          sprite.scale.set(8, 2.2, 1);
          sprite.position.set(x, y + 5.5, z);
          scene.add(sprite);
          productIndex++;
        }
      }
    }
  })
  .catch(err => {
    alert('Failed to load products.');
    console.error(err);
  });

// First-person movement (WASD/arrow keys)
const move = { forward: false, backward: false, left: false, right: false, up: false, down: false };
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': move.forward = true; break;
    case 'ArrowLeft': case 'KeyA': move.left = true; break;
    case 'ArrowDown': case 'KeyS': move.backward = true; break;
    case 'ArrowRight': case 'KeyD': move.right = true; break;
    case 'KeyQ': move.up = true; break;
    case 'KeyE': move.down = true; break;
  }
});
document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': move.forward = false; break;
    case 'ArrowLeft': case 'KeyA': move.left = false; break;
    case 'ArrowDown': case 'KeyS': move.backward = false; break;
    case 'ArrowRight': case 'KeyD': move.right = false; break;
    case 'KeyQ': move.up = false; break;
    case 'KeyE': move.down = false; break;
  }
});

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  if (controls.isLocked) {
    const delta = (time - prevTime) / 1000;
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= velocity.y * 10.0 * delta;
    direction.z = Number(move.forward) - Number(move.backward);
    direction.x = Number(move.right) - Number(move.left);
    direction.y = Number(move.up) - Number(move.down);
    direction.normalize();
    if (move.forward || move.backward) velocity.z -= direction.z * 60.0 * delta;
    if (move.left || move.right) velocity.x -= direction.x * 60.0 * delta;
    if (move.up || move.down) velocity.y -= direction.y * 60.0 * delta;
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y += velocity.y * delta;
    // Clamp camera height to stay inside room
    controls.getObject().position.y = Math.max(3, Math.min(45, controls.getObject().position.y));
  }
  prevTime = time;
  renderer.render(scene, camera);
}
animate();

// Raycaster for picking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- 360 Product Viewer ---
// ...existing code...

function startInspectProduct(mesh, product, isModal = false) {
  inspectingProduct = mesh;
  inspectOverlay = document.createElement('div');
  inspectOverlay.style.position = 'fixed';
  inspectOverlay.style.top = '0';
  inspectOverlay.style.left = '0';
  inspectOverlay.style.width = '100vw';
// --- Product Card Modal ---
function showProductCard(product) {
  let modal = document.getElementById('vr-product-card');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vr-product-card';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '3000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = `<div style='background:#fff;border-radius:18px;box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:32px 24px 24px 24px;max-width:420px;width:98vw;display:flex;flex-direction:column;align-items:center;'>
      <img src='${product.thumbnail}' alt='${product.title}' style='width:180px;height:180px;object-fit:contain;border-radius:12px;margin-bottom:18px;'>
      <h2 style='font-size:1.5rem;font-weight:700;color:#8b7b6b;margin-bottom:8px;text-align:center;'>${product.title}</h2>
      <p style='font-size:1.1rem;color:#555;margin-bottom:8px;text-align:center;'>${product.description || 'No description available.'}</p>
      <p style='font-weight:bold;font-size:1.2rem;color:#d2b48c;margin-bottom:18px;'>₹${product.price * 85}</p>
      <div style='display:flex;gap:18px;margin-bottom:12px;'>
        <button id='vr-add-cart' style='padding:10px 24px;background:#8b7b6b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:1rem;'>Add to Cart</button>
        <button id='vr-add-wishlist' style='padding:10px 24px;background:#d2b48c;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:1rem;'>Add to Wishlist</button>
      </div>
      <button id='vr-card-close' style='margin-top:8px;padding:8px 24px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;font-weight:500;'>Close</button>
      <button id='vr-card-return' style='margin-top:8px;padding:8px 24px;background:#8b7b6b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;'>Return to Products</button>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('vr-card-close').onclick = () => modal.remove();
    document.getElementById('vr-card-return').onclick = () => { window.location.href = '/products'; };
  } else {
    modal.style.display = 'flex';
  }
  // Add to Cart
  document.getElementById('vr-add-cart').onclick = function() {
    fetch('/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, title: product.title, price: product.price, image: product.thumbnail })
    }).then(res => res.json()).then(data => {
      alert('Added to cart!');
    }).catch(() => alert('Error adding to cart.'));
  };
  // Add to Wishlist
  document.getElementById('vr-add-wishlist').onclick = function() {
    fetch('/wishlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, title: product.title, price: product.price, image_url: product.thumbnail })
    }).then(res => res.json()).then(data => {
      alert('Added to wishlist!');
    }).catch(() => alert('Error adding to wishlist.'));
  };
}

  function onClick(event) {
    // Convert screen coords to normalized device coords
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    // Intersect recursively for groups
    const intersects = raycaster.intersectObjects(productMeshes, true);
    if (intersects.length > 0) {
      // Find the product data from the mesh or its parent group
      let mesh = intersects[0].object;
      let product = mesh.userData.product || (mesh.parent && mesh.parent.userData.product);
      if (product) {
        showProductCard(product);
      }
    }
  }
  window.addEventListener('click', onClick);

function showProductCard(product) {
  let modal = document.getElementById('vr-product-card');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vr-product-card';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '3000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = `<div style='background:#fff;border-radius:18px;box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:32px 24px 24px 24px;max-width:420px;width:98vw;display:flex;flex-direction:column;align-items:center;'>
      <img src='${product.thumbnail}' alt='${product.title}' style='width:180px;height:180px;object-fit:contain;border-radius:12px;margin-bottom:18px;'>
      <h2 style='font-size:1.5rem;font-weight:700;color:#8b7b6b;margin-bottom:8px;text-align:center;'>${product.title}</h2>
      <p style='font-size:1.1rem;color:#555;margin-bottom:8px;text-align:center;'>${product.description || 'No description available.'}</p>
      <p style='font-weight:bold;font-size:1.2rem;color:#d2b48c;margin-bottom:18px;'>₹${product.price * 85}</p>
      <div style='display:flex;gap:18px;margin-bottom:12px;'>
        <button id='vr-add-cart' style='padding:10px 24px;background:#8b7b6b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:1rem;'>Add to Cart</button>
        <button id='vr-add-wishlist' style='padding:10px 24px;background:#d2b48c;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:1rem;'>Add to Wishlist</button>
      </div>
      <button id='vr-card-close' style='margin-top:8px;padding:8px 24px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;font-weight:500;'>Close</button>
      <button id='vr-card-return' style='margin-top:8px;padding:8px 24px;background:#8b7b6b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;'>Return to Products</button>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('vr-card-close').onclick = () => modal.remove();
    document.getElementById('vr-card-return').onclick = () => { window.location.href = '/products'; };
  } else {
    modal.style.display = 'flex';
  }
  // Add to Cart
  document.getElementById('vr-add-cart').onclick = function() {
    fetch('/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, title: product.title, price: product.price, image: product.thumbnail })
    }).then(res => res.json()).then(data => {
      alert('Added to cart!');
    }).catch(() => alert('Error adding to cart.'));
  };
  // Add to Wishlist
  document.getElementById('vr-add-wishlist').onclick = function() {
    fetch('/wishlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, title: product.title, price: product.price, image_url: product.thumbnail })
    }).then(res => res.json()).then(data => {
      alert('Added to wishlist!');
    }).catch(() => alert('Error adding to wishlist.'));
  };
}

// Add a button to return from VR store to products page (always visible)
const returnBtn = document.createElement('button');
returnBtn.textContent = '← Return to Products';
returnBtn.style.position = 'fixed';
returnBtn.style.top = '24px';
returnBtn.style.left = '24px';
returnBtn.style.zIndex = '2100';
returnBtn.style.background = '#14b8a6';
returnBtn.style.color = '#fff';
returnBtn.style.fontSize = '1.1rem';
returnBtn.style.padding = '10px 24px';
returnBtn.style.border = 'none';
returnBtn.style.borderRadius = '8px';
returnBtn.style.boxShadow = '0 2px 8px #b2f5ea';
returnBtn.style.cursor = 'pointer';
returnBtn.onclick = () => { window.location.href = '/products'; };
document.body.appendChild(returnBtn);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
// End of file: ensure all blocks are properly closed
}
