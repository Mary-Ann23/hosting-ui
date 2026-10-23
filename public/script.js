/* =========================================
JABIÑAR FOOD STORE
Modern Grocery Store Design
========================================= */

:root {
--green: #23834b;
--green-dark: #176438;
--green-light: #eaf7ee;
--purple: #7650b8;
--text: #24352b;
--muted: #718076;
--white: #ffffff;
--bg: #f6f9f5;
--border: #e2eae3;
--danger: #d83e3e;
--shadow: 0 8px 28px rgba(28, 65, 40, 0.09);
--radius: 16px;
}

* {
  box-sizing: border-box;
  }

html {
scroll-behavior: smooth;
}

body {
margin: 0;
font-family: Arial, Helvetica, sans-serif;
color: var(--text);
background: var(--bg);
line-height: 1.6;
}

body,
button,
input,
textarea,
select {
font-family: Arial, Helvetica, sans-serif;
}

button,
input,
textarea,
select {
font-size: 15px;
}

button {
cursor: pointer;
transition: background 0.2s ease, transform 0.2s ease;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible {
outline: 3px solid rgba(35, 131, 75, 0.22);
outline-offset: 2px;
}

img {
display: block;
max-width: 100%;
}

a {
color: var(--green);
text-decoration: none;
}

/* HEADER */

header,
.site-header,
.main-header {
background: var(--white);
}

header {
position: sticky;
top: 0;
z-index: 50;
border-bottom: 1px solid var(--border);
}

.header-container,
.header-inner,
.nav-container {
width: min(1200px, 92%);
margin: 0 auto;
}

header .container,
header .header-inner,
header .header-container,
header .nav-container {
min-height: 72px;
display: flex;
align-items: center;
justify-content: space-between;
gap: 16px;
}

.logo,
.brand,
.site-logo {
color: var(--green-dark);
font-weight: 800;
letter-spacing: -0.5px;
}

nav {
display: flex;
align-items: center;
gap: 20px;
}

nav a {
color: var(--text);
font-weight: 600;
}

nav a:hover {
color: var(--green);
}

/* GENERAL CONTAINERS */

.container,
main,
.page-container {
width: min(1200px, 92%);
margin-right: auto;
margin-left: auto;
}

section {
scroll-margin-top: 90px;
}

.section-title,
.products-heading {
margin-bottom: 20px;
}

.section-title h2,
.products-heading h2 {
margin-bottom: 4px;
font-size: clamp(22px, 3vw, 30px);
}

.section-title p,
.products-heading p {
margin-top: 0;
color: var(--muted);
}

/* HERO */

.hero,
.hero-section,
.home-hero {
padding: 58px 0;
background: linear-gradient(135deg, #eaf7ee, #f9fcf7);
}

.hero h1,
.hero-section h1,
.home-hero h1 {
max-width: 700px;
margin: 0 0 14px;
color: var(--green-dark);
font-size: clamp(32px, 5vw, 54px);
line-height: 1.15;
}

.hero p,
.hero-section p,
.home-hero p {
max-width: 650px;
color: #52685a;
}

.hero button,
.hero a,
.primary-button {
display: inline-flex;
align-items: center;
justify-content: center;
gap: 8px;
padding: 12px 22px;
border: 0;
border-radius: 10px;
background: var(--green);
color: var(--white);
font-weight: 700;
}

.hero button:hover,
.primary-button:hover {
background: var(--green-dark);
}

/* SEARCH */

.search-form,
.search-container,
#searchForm {
display: flex;
gap: 10px;
width: 100%;
max-width: 720px;
}

.search-form input,
.search-container input,
#searchInput {
flex: 1;
min-width: 0;
padding: 13px 16px;
border: 1px solid var(--border);
border-radius: 11px;
background: var(--white);
}

.search-form button,
.search-container button,
#searchForm button {
padding: 12px 20px;
border: 0;
border-radius: 11px;
background: var(--green);
color: var(--white);
font-weight: 700;
}

/* CATEGORY CHIPS */

.category-list,
.categories,
.category-chips,
#categoryList {
display: flex;
flex-wrap: wrap;
gap: 10px;
margin: 20px 0 28px;
}

.category-list button,
.categories button,
.category-chips button,
#categoryList button {
padding: 9px 16px;
border: 1px solid var(--border);
border-radius: 999px;
background: var(--white);
color: var(--text);
font-weight: 600;
}

.category-list button:hover,
.categories button:hover,
.category-chips button:hover,
#categoryList button:hover,
.category-list button.active,
.categories button.active,
.category-chips button.active,
#categoryList button.active {
border-color: var(--green);
background: var(--green);
color: var(--white);
}

/* PRODUCT GRID */

#productGrid,
.product-grid,
.products-grid {
display: grid;
grid-template-columns: repeat(4, minmax(0, 1fr));
gap: 22px;
align-items: stretch;
}

.product-card,
.product-item,
.product {
min-width: 0;
overflow: hidden;
border: 1px solid var(--border);
border-radius: var(--radius);
background: var(--white);
box-shadow: 0 3px 12px rgba(28, 65, 40, 0.04);
transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-card:hover,
.product-item:hover,
.product:hover {
transform: translateY(-4px);
box-shadow: var(--shadow);
}

.product-card img,
.product-item img,
.product img,
.product-image,
.product-card .product-image {
width: 100%;
height: 190px;
object-fit: cover;
background: #edf4ed;
}

.product-card-content,
.product-info,
.product-details {
padding: 15px;
}

.product-card h3,
.product-item h3,
.product h3 {
margin: 0 0 6px;
font-size: 17px;
line-height: 1.4;
}

.product-card p,
.product-item p,
.product p {
color: var(--muted);
font-size: 13px;
}

.product-price,
.price {
color: var(--green-dark);
font-size: 20px;
font-weight: 800;
}

.product-card button,
.product-item button,
.product button,
.add-to-cart {
width: 100%;
margin-top: 12px;
padding: 11px 12px;
border: 0;
border-radius: 10px;
background: var(--green);
color: var(--white);
font-weight: 700;
}

.product-card button:hover,
.product-item button:hover,
.product button:hover,
.add-to-cart:hover {
background: var(--green-dark);
}

#productCount {
color: var(--muted);
font-size: 14px;
}

/* GENERAL BUTTONS */

button:disabled {
cursor: not-allowed;
opacity: 0.55;
}

.secondary-button {
padding: 10px 15px;
border: 1px solid var(--border);
border-radius: 9px;
background: var(--white);
color: var(--text);
}

/* MODAL BACKDROP */

#modalBackdrop,
.modal-backdrop {
position: fixed;
inset: 0;
z-index: 1000;
display: none;
align-items: center;
justify-content: center;
padding: 20px;
overflow-y: auto;
background: rgba(19, 35, 24, 0.58);
backdrop-filter: blur(4px);
}

#modalBackdrop.active,
#modalBackdrop.show,
.modal-backdrop.active,
.modal-backdrop.show {
display: flex;
}

#modalContent,
.modal-content {
position: relative;
width: min(920px, 100%);
max-height: calc(100dvh - 40px);
overflow-y: auto;
padding: 25px;
border: 1px solid rgba(255, 255, 255, 0.6);
border-radius: 20px;
background: var(--white);
box-shadow: 0 20px 70px rgba(0, 0, 0, 0.2);
}

#modalContent > h2,
.modal-content > h2 {
margin: 0 0 18px;
padding-bottom: 13px;
border-bottom: 1px solid var(--border);
color: var(--green-dark);
font-size: 24px;
}

/* CHECKOUT */

.checkout-page {
width: 100%;
}

.checkout-subtitle {
margin: -7px 0 22px;
color: var(--muted);
font-size: 14px;
}

.checkout-layout {
display: grid;
grid-template-columns: minmax(0, 1.45fr) minmax(250px, 0.85fr);
align-items: start;
gap: 22px;
}

.checkout-form {
display: flex;
flex-direction: column;
gap: 20px;
min-width: 0;
}

.checkout-section {
padding: 20px;
border: 1px solid var(--border);
border-radius: 15px;
background: var(--white);
}

.checkout-section h3 {
display: flex;
align-items: center;
gap: 10px;
margin: 0 0 6px;
font-size: 18px;
line-height: 1.4;
}

.checkout-step {
display: inline-flex;
flex: 0 0 30px;
width: 30px;
height: 30px;
align-items: center;
justify-content: center;
border-radius: 50%;
background: var(--green-light);
color: var(--green-dark);
font-size: 14px;
font-weight: 800;
}

.checkout-hint {
margin: 0 0 17px;
color: var(--muted);
font-size: 13px;
}

.checkout-section > label {
display: block;
margin: 14px 0 6px;
color: var(--text);
font-size: 13px;
font-weight: 700;
}

.checkout-section input:not([type="radio"]),
.checkout-section textarea,
.checkout-section select {
display: block;
width: 100%;
min-height: 45px;
padding: 11px 12px;
border: 1px solid #dce5dd;
border-radius: 9px;
background: #fbfdfb;
color: var(--text);
outline: none;
transition: border-color 0.2s, box-shadow 0.2s;
}

.checkout-section textarea {
min-height: 72px;
resize: vertical;
}

.checkout-section input:focus,
.checkout-section textarea:focus,
.checkout-section select:focus {
border-color: var(--green);
box-shadow: 0 0 0 3px rgba(35, 131, 75, 0.1);
}

/* PAYMENT METHODS */

.checkout-payment-options {
display: grid;
gap: 12px;
margin-top: 15px;
}

.checkout-payment-card {
display: flex;
align-items: center;
gap: 12px;
padding: 15px;
border: 1px solid var(--border);
border-radius: 12px;
background: #fff;
cursor: pointer;
transition: border-color 0.2s, background 0.2s;
}

.checkout-payment-card:has(input:checked) {
border-color: var(--green);
background: var(--green-light);
box-shadow: 0 0 0 1px var(--green);
}

.checkout-payment-card input[type="radio"] {
flex: 0 0 auto;
width: 17px;
height: 17px;
accent-color: var(--green);
}

.checkout-payment-icon {
display: inline-flex;
flex: 0 0 42px;
width: 42px;
height: 42px;
align-items: center;
justify-content: center;
border-radius: 10px;
background: #f0f5f0;
font-size: 22px;
}

.checkout-payment-card strong,
.checkout-payment-card small {
display: block;
}

.checkout-payment-card strong {
font-size: 14px;
}

.checkout-payment-card small {
margin-top: 3px;
color: var(--muted);
font-size: 12px;
line-height: 1.5;
}

/* SAFE CHECKOUT */

.checkout-secure {
display: flex;
align-items: center;
gap: 11px;
padding: 13px 15px;
border: 1px solid #d8ecdf;
border-radius: 11px;
background: #f2faf4;
}

.checkout-secure strong,
.checkout-secure small {
display: block;
}

.checkout-secure strong {
color: var(--green-dark);
font-size: 13px;
}

.checkout-secure small {
color: var(--muted);
font-size: 12px;
}

/* PLACE ORDER */

.checkout-place-order {
width: 100%;
min-height: 50px;
padding: 13px 18px;
border: 0;
border-radius: 11px;
background: var(--green);
color: var(--white);
font-size: 16px;
font-weight: 800;
box-shadow: 0 5px 12px rgba(35, 131, 75, 0.15);
}

.checkout-place-order:hover {
background: var(--green-dark);
transform: translateY(-1px);
}

.checkout-message {
margin: 0;
color: var(--danger);
font-size: 13px;
}

.checkout-message:empty {
display: none;
}

/* ORDER SUMMARY */

.checkout-summary {
position: sticky;
top: 12px;
min-width: 0;
padding: 20px;
border: 1px solid var(--border);
border-radius: 15px;
background: #f9fcf9;
}

.checkout-summary h3 {
margin: 0;
color: var(--green-dark);
font-size: 18px;
}

.checkout-item-count {
margin: 5px 0 16px;
color: var(--muted);
font-size: 13px;
}

.checkout-summary-items {
display: flex;
flex-direction: column;
gap: 13px;
max-height: 270px;
overflow-y: auto;
}

.checkout-summary-item {
display: flex;
align-items: flex-start;
justify-content: space-between;
gap: 12px;
padding-bottom: 12px;
border-bottom: 1px solid var(--border);
font-size: 13px;
}

.checkout-item-details {
min-width: 0;
}

.checkout-item-details strong,
.checkout-item-details small {
display: block;
overflow-wrap: anywhere;
}

.checkout-item-details small {
margin-top: 3px;
color: var(--muted);
}

.checkout-summary-item > strong {
flex-shrink: 0;
}

.checkout-total-row {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
padding-top: 13px;
font-size: 14px;
}

.checkout-grand-total {
margin-top: 12px;
padding-top: 16px;
border-top: 1px solid var(--border);
color: var(--green-dark);
font-size: 18px;
}

.checkout-summary-note {
margin: 18px 0 0;
padding: 12px;
border-radius: 10px;
background: #f0eafa;
color: #6846a5;
font-size: 12px;
text-align: center;
}

/* CART */

.cart-item,
.checkout-cart-item {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
padding: 13px 0;
border-bottom: 1px solid var(--border);
}

.cart-item button,
.checkout-cart-item button {
border: 0;
border-radius: 7px;
background: #fff0f0;
color: var(--danger);
}

.cart-total {
margin-top: 18px;
color: var(--green-dark);
font-size: 20px;
font-weight: 800;
}

/* AUTH FORMS */

.auth-form,
.login-form,
.register-form {
display: flex;
flex-direction: column;
gap: 12px;
}

.auth-form label,
.login-form label,
.register-form label {
font-size: 13px;
font-weight: 700;
}

.auth-form input,
.login-form input,
.register-form input {
width: 100%;
padding: 12px;
border: 1px solid var(--border);
border-radius: 9px;
background: var(--white);
}

.auth-form button,
.login-form button,
.register-form button {
padding: 12px;
border: 0;
border-radius: 9px;
background: var(--green);
color: var(--white);
font-weight: 700;
}

/* TOAST */

#toast,
.toast {
position: fixed;
right: 20px;
bottom: 20px;
z-index: 2000;
max-width: calc(100vw - 40px);
padding: 13px 18px;
border-radius: 11px;
background: #24352b;
color: var(--white);
box-shadow: var(--shadow);
}

/* ORDERS */

.order-card,
.my-order-card {
margin: 14px 0;
padding: 17px;
border: 1px solid var(--border);
border-radius: 13px;
background: var(--white);
}

.order-card h3,
.my-order-card h3 {
margin-top: 0;
}

/* FOOTER */

footer {
margin-top: 60px;
padding: 28px 4%;
background: #173d28;
color: #eef8f0;
text-align: center;
}

footer p {
margin: 4px 0;
}

/* TABLET */

@media (max-width: 900px) {
#productGrid,
.product-grid,
.products-grid {
grid-template-columns: repeat(3, minmax(0, 1fr));
gap: 16px;
}

.checkout-layout {
grid-template-columns: minmax(0, 1fr);
}

.checkout-summary {
position: static;
grid-row: 1;
}

#modalContent,
.modal-content {
width: min(720px, 100%);
}
}

/* MOBILE */

@media (max-width: 600px) {
body {
font-size: 14px;
}

.container,
main,
.page-container,
.header-container,
.header-inner,
.nav-container {
width: 94%;
}

header .container,
header .header-inner,
header .header-container,
header .nav-container {
min-height: 62px;
gap: 8px;
}

nav {
flex-wrap: wrap;
justify-content: flex-end;
gap: 8px 12px;
}

nav a {
font-size: 12px;
}

.hero,
.hero-section,
.home-hero {
padding: 36px 0;
}

#productGrid,
.product-grid,
.products-grid {
grid-template-columns: repeat(2, minmax(0, 1fr));
gap: 12px;
}

.product-card img,
.product-item img,
.product img,
.product-image {
height: 145px;
}

.product-card-content,
.product-info,
.product-details {
padding: 11px;
}

.product-card h3,
.product-item h3,
.product h3 {
font-size: 14px;
}

.product-price,
.price {
font-size: 17px;
}

.product-card button,
.product-item button,
.product button,
.add-to-cart {
padding: 10px 7px;
font-size: 12px;
}

.search-form,
.search-container,
#searchForm {
gap: 7px;
}

.search-form input,
.search-container input,
#searchInput {
padding: 11px;
font-size: 13px;
}

.search-form button,
.search-container button,
#searchForm button {
padding: 10px;
font-size: 13px;
}

#modalBackdrop,
.modal-backdrop {
align-items: flex-start;
padding: 10px;
}

#modalContent,
.modal-content {
max-height: calc(100dvh - 20px);
padding: 16px;
border-radius: 15px;
}

#modalContent > h2,
.modal-content > h2 {
font-size: 20px;
}

.checkout-layout {
gap: 14px;
}

.checkout-section,
.checkout-summary {
padding: 15px;
border-radius: 12px;
}

.checkout-section h3,
.checkout-summary h3 {
font-size: 16px;
}

.checkout-payment-card {
padding: 11px;
gap: 9px;
}

.checkout-payment-icon {
flex-basis: 36px;
width: 36px;
height: 36px;
font-size: 19px;
}

.checkout-place-order {
font-size: 14px;
}

footer {
margin-top: 38px;
}
}

/* SMALL PHONES */

@media (max-width: 360px) {
#productGrid,
.product-grid,
.products-grid {
gap: 8px;
}

.product-card img,
.product-item img,
.product img,
.product-image {
height: 120px;
}

.checkout-section,
.checkout-summary {
padding: 12px;
}
}
