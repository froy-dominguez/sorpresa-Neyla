const FIREBASE_CONFIG = window.FROY_FIREBASE_CONFIG || {};
const userParams = new URLSearchParams(window.location.search);
const requestedUser = userParams.get('usuario') || userParams.get('user');
const storedUser = localStorage.getItem('froyUsuario');
const currentUser = ['froy', 'neyla'].includes((requestedUser || storedUser || '').toLowerCase())
  ? (requestedUser || storedUser).toLowerCase()
  : 'froy';
localStorage.setItem('froyUsuario', currentUser);

const distanceValue = document.querySelector('#distanceValue');
const distanceUnit = document.querySelector('#distanceUnit');
const distanceStatus = document.querySelector('#distanceStatus');
const distancePhrase = document.querySelector('#distancePhrase');
const locationButton = document.querySelector('#locationButton');
const profileSelector = document.querySelector('#profileSelector');
const frasesDistancia = [
  'Cada kilometro tambien guarda una historia de los dos.',
  'Aunque estes lejos, siempre encuentro el camino hacia ti.',
  'La distancia mide el espacio; nuestro carino mide lo infinito.',
  'Buenos dias, Neyla. Mi primer pensamiento tambien viaja hasta ti.',
  'Buenas noches, amor. Que la distancia no te quite mi abrazo.',
  'Hoy el mundo da otra vuelta y mi corazon vuelve a elegirte.'
];
let database = null;
let otherLocation = null;
let selectedProfile = currentUser;

function actualizarFraseDistancia() {
  const ahora = new Date();
  const indice = ahora.getHours() < 12 ? 3 : ahora.getHours() >= 20 ? 4 : (ahora.getDate() + ahora.getMonth()) % 3;
  distancePhrase.textContent = frasesDistancia[indice];
}

function calcularDistanciaKm(latitud, longitud, destino) {
  const radioTierra = 6371;
  const toRadians = (value) => value * Math.PI / 180;
  const deltaLatitud = toRadians(destino.latitude - latitud);
  const deltaLongitud = toRadians(destino.longitude - longitud);
  const origen = Math.sin(deltaLatitud / 2) ** 2 + Math.cos(toRadians(latitud)) * Math.cos(toRadians(destino.latitude)) * Math.sin(deltaLongitud / 2) ** 2;
  return radioTierra * 2 * Math.atan2(Math.sqrt(origen), Math.sqrt(1 - origen));
}

function pintarDistancia(distanciaKm) {
  if (distanciaKm < 1) { distanceValue.textContent = Math.round(distanciaKm * 1000).toLocaleString('es'); distanceUnit.textContent = 'metros'; }
  else { distanceValue.textContent = distanciaKm.toLocaleString('es', { maximumFractionDigits: 1 }); distanceUnit.textContent = 'km'; }
}

function actualizarEstado() {
  const otherUser = selectedProfile === 'froy' ? 'neyla' : 'froy';
  if (!otherLocation) { distanceStatus.textContent = `${otherUser === 'froy' ? 'Froy' : 'Neyla'} está desconectado/a. Esperando ubicación...`; return; }
  const ownLocation = window.currentOwnLocation;
  if (!ownLocation) { distanceStatus.textContent = `${otherUser === 'froy' ? 'Froy' : 'Neyla'} está en línea`; return; }
  pintarDistancia(calcularDistanciaKm(ownLocation.latitude, ownLocation.longitude, otherLocation));
  distanceStatus.textContent = `${otherUser === 'froy' ? 'Froy' : 'Neyla'} está en línea · distancia actualizada`;
}

function manejarErrorUbicacion(error) {
  distanceStatus.textContent = error.code === 1 ? 'Activa el GPS y permite el acceso a tu ubicación.' : 'No se pudo obtener tu ubicación. Revisa el GPS.';
  locationButton.disabled = false;
  locationButton.textContent = `Saber ubicación actual de ${selectedProfile === 'froy' ? 'Neyla' : 'Froy'}`;
}

function iniciarFirebase() {
  const ready = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL && window.firebase;
  if (!ready) { distanceStatus.textContent = `Modo local (${selectedProfile}). Configura Firebase para sincronizar.`; return; }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    database = firebase.database();
    const otherUser = selectedProfile === 'froy' ? 'neyla' : 'froy';
    database.ref(`/ubicaciones/${otherUser}`).on('value', (snapshot) => { otherLocation = snapshot.val(); actualizarEstado(); });
  } catch (error) {
    distanceStatus.textContent = 'No se pudo conectar con Firebase.';
    console.error('Firebase:', error);
  }
}

function pedirUbicacionActual() {
  if (!navigator.geolocation) { 
    distanceStatus.textContent = 'La geolocalización no está disponible en este navegador.'; 
    return; 
  }
  locationButton.disabled = true;
  locationButton.textContent = '⌁ Obteniendo ubicación...';
  distanceStatus.textContent = 'Solicitando permiso de ubicación...';
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = { 
        latitude: position.coords.latitude, 
        longitude: position.coords.longitude, 
        accuracy: position.coords.accuracy, 
        updatedAt: window.firebase?.database?.ServerValue?.TIMESTAMP || Date.now() 
      };
      window.currentOwnLocation = location;
      if (database) {
        database.ref(`/ubicaciones/${selectedProfile}`).set(location)
          .catch(() => { 
            distanceStatus.textContent = 'GPS activo, pero Firebase no pudo guardar la ubicación.'; 
          });
      }
      locationButton.disabled = false;
      locationButton.textContent = `Ubicación obtenida como ${selectedProfile}`;
      actualizarEstado();
    },
    manejarErrorUbicacion,
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

function cambiarPerfil() {
  selectedProfile = profileSelector.value;
  localStorage.setItem('froyUsuario', selectedProfile);
  if (database) {
    const otherUser = selectedProfile === 'froy' ? 'neyla' : 'froy';
    database.ref(`/ubicaciones/${otherUser}`).on('value', (snapshot) => { otherLocation = snapshot.val(); actualizarEstado(); });
  }
  locationButton.textContent = `Saber ubicación actual de ${selectedProfile === 'froy' ? 'Neyla' : 'Froy'}`;
  actualizarEstado();
}

actualizarFraseDistancia();

profileSelector.addEventListener('change', cambiarPerfil);
locationButton.addEventListener('click', pedirUbicacionActual);
window.setInterval(actualizarFraseDistancia, 60000);
    }
