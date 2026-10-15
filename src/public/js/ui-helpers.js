// Helpers de UI compartidos por las vistas que consumen la API JSON
// (catalogo de productos y carrito). Se cargan una sola vez desde el layout
// y quedan expuestos en window.UI para no repetir el mismo codigo en cada vista.

// Escapa caracteres para no inyectar HTML desde datos que vienen de la API
const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatPrice = (value) => '$' + Number(value).toLocaleString('es-AR');

// Renderiza un mensaje de alerta dentro de un elemento contenedor
const showMsg = (element, text, type = 'success') => {
    element.innerHTML = `<div class="alert alert-${type}">${escapeHtml(text)}</div>`;
};

// Envuelve fetch: parsea JSON y lanza un Error con el mensaje de la API
async function requestJson(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Ocurrió un error inesperado');
    return data;
}

window.UI = { escapeHtml, formatPrice, showMsg, requestJson };
