// Configuração do app Web do projeto Projeto FSG.
// Estes dados identificam o app web e podem ficar no GitHub; nunca coloque uma chave de conta de serviço aqui.
export const firebaseConfig = {
  apiKey: "AIzaSyB1WpNfWKJShTtfGRnnjwknGULanQH8",
  authDomain: "projeto-fsg.firebaseapp.com",
  databaseURL: "https://projeto-fsg-default-rtdb.firebaseio.com",
  projectId: "projeto-fsg",
  storageBucket: "projeto-fsg.firebasestorage.app",
  messagingSenderId: "935977656456",
  appId: "1:935977656456:web:4693c867de995c445bff3d",
  measurementId: "G-CW3M2XQNQ5"
};

export const isFirebaseConfigured = () =>
  [firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId, firebaseConfig.appId]
    .every((value) => value && !value.startsWith("COLE_AQUI"));
