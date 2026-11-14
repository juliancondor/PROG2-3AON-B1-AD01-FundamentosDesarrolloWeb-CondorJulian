// 1. DATOS DE PRUEBA
const usuarios = [
  { id: 1, nombre: "Administrador MecaAuto", correo: "admin@mecaauto.com", clave: "123456", telefono: "0991111111", rol: "Administrador", activo: true },
  { id: 2, nombre: "Ana López", correo: "ana@correo.com", clave: "123456", telefono: "0992222222", rol: "Cliente", activo: true },
  { id: 3, nombre: "Carlos Pérez", correo: "carlos@correo.com", clave: "123456", telefono: "0993333333", rol: "Cliente", activo: true },
  { id: 4, nombre: "Cuenta Inactiva", correo: "inactivo@correo.com", clave: "123456", telefono: "0994444444", rol: "Cliente", activo: false }
];
const estados = ["Pendiente", "En revisión", "En proceso", "Finalizado", "Cancelado"];
let idEdicion = 0; 

// 2. FUNCIONES BÁSICAS
function campo(id) {
  return document.getElementById(id);
}

function usuarioActual() {
  const id = Number(localStorage.getItem("mecaauto_usuario"));
  return usuarios.find(u => u.id === id && u.activo);
}

function esAdmin() {
  const usuario = usuarioActual();
  return usuario && usuario.rol === "Administrador";
}

function leerSolicitudes() {
  return JSON.parse(localStorage.getItem("mecaauto_solicitudes") || "[]");
}

function guardarSolicitudes(lista) {
  localStorage.setItem("mecaauto_solicitudes", JSON.stringify(lista));
}

function fechaHoy() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return anio + "-" + mes + "-" + dia;
}

// 3. AL ABRIR CUALQUIER PÁGINA
// Solo ejecutamos la función correspondiente si existe su elemento HTML.
document.addEventListener("DOMContentLoaded", function () {
  actualizarMenu();

  if (campo("btnLogout")) campo("btnLogout").addEventListener("click", cerrarSesion);

  if (campo("formLogin")) {
    campo("formLogin").addEventListener("submit", iniciarSesion);
    if (usuarioActual()) {
      campo("seccionLogin").classList.add("oculto");
      campo("mensajeBienvenida").classList.remove("oculto");
      campo("textoBienvenida").textContent = "Bienvenido/a, " + usuarioActual().nombre + ".";
    }
  }

  if (campo("formSolicitud")) {
    campo("formSolicitud").addEventListener("submit", registrarSolicitud);
    prepararFormulario();
  }

  if (campo("panelCuenta")) mostrarCuenta();
});

// 4. MENÚ Y LOGIN
function actualizarMenu() {
  const usuario = usuarioActual();

  for (const enlace of document.querySelectorAll(".auth-only")) {
    enlace.classList.toggle("d-none", !usuario);
  }
  for (const enlace of document.querySelectorAll(".admin-only")) {
    enlace.classList.toggle("d-none", !esAdmin());
  }

  if (campo("btnLogin")) campo("btnLogin").classList.toggle("d-none", !!usuario);
  if (campo("accountControls")) campo("accountControls").classList.toggle("d-none", !usuario);

  if (usuario && campo("accountName")) {
    campo("accountName").textContent = usuario.nombre;
    campo("accountAvatar").textContent = usuario.nombre.charAt(0);
  }
}

function iniciarSesion(evento) {
  evento.preventDefault();
  const correo = campo("correoLogin").value.trim().toLowerCase();
  const clave = campo("claveLogin").value;
  const usuario = usuarios.find(u => u.correo === correo && u.clave === clave);

  if (!usuario) {
    Swal.fire("Datos incorrectos", "Revisa el correo y la contraseña.", "error");
    return;
  }
  if (!usuario.activo) {
    Swal.fire("Cuenta deshabilitada", "Esta cuenta no puede ingresar.", "warning");
    return;
  }

  localStorage.setItem("mecaauto_usuario", usuario.id);
  Swal.fire("¡Bienvenido!", "Ingresaste como " + usuario.rol, "success").then(function () {
    window.location.href = "cuenta.html";
  });
}

function cerrarSesion() {
  localStorage.removeItem("mecaauto_usuario");
  window.location.href = "index.html";
}

// 5. FORMULARIO DE MANTENIMIENTO
function prepararFormulario() {
  const usuario = usuarioActual();
  if (!usuario) {
    campo("avisoSolicitud").classList.remove("oculto");
    return;
  }

  // El administrador puede abrir solicitud.html?editar=123 para modificar.
  const codigo = new URLSearchParams(window.location.search).get("editar");
  let anterior = null;

  if (codigo !== null) {
    if (!esAdmin()) {
      campo("textoAvisoSolicitud").textContent = "Acceso denegado. Solo el administrador puede editar.";
      campo("avisoSolicitud").classList.remove("oculto");
      return;
    }
    anterior = leerSolicitudes().find(s => s.id === Number(codigo));
    if (!anterior) {
      campo("textoAvisoSolicitud").textContent = "No se encontró esa solicitud.";
      campo("avisoSolicitud").classList.remove("oculto");
      return;
    }
    idEdicion = anterior.id;
    campo("tituloFormulario").textContent = "Editar solicitud #" + idEdicion;
    campo("btnGuardarSolicitud").textContent = "Guardar cambios";
  }

  campo("zonaFormulario").classList.remove("oculto");
  campo("fecha").min = fechaHoy();
  campo("anio").max = new Date().getFullYear() + 1;

  if (esAdmin()) {
    campo("grupoSeleccionCliente").classList.remove("oculto");
    const lista = campo("seleccionarCliente");
    lista.innerHTML = "";
    for (const persona of usuarios) {
      if (persona.activo) {
        const opcion = document.createElement("option");
        opcion.value = persona.id;
        opcion.textContent = persona.nombre;
        lista.appendChild(opcion);
      }
    }
    lista.value = anterior ? anterior.usuarioId : usuario.id;
    lista.addEventListener("change", completarCliente);
    completarCliente();
  } else {
    campo("nombreCliente").value = usuario.nombre;
    campo("emailCliente").value = usuario.correo;
    campo("telefono").value = usuario.telefono;
  }

  if (anterior) {
    // Los nombres de estos campos coinciden con los del objeto solicitud.
    const nombres = ["telefono", "placa", "marca", "modelo", "anio", "kilometraje", "servicio", "fecha", "hora", "observaciones"];
    for (const nombre of nombres) campo(nombre).value = anterior[nombre];
    document.querySelector('input[name="prioridad"][value="' + anterior.prioridad + '"]').checked = true;
    campo("lavado").checked = anterior.lavado;
    campo("revisionFluidos").checked = anterior.revisionFluidos;
    campo("aceptoDatos").checked = true;
  }
}

function completarCliente() {
  const id = Number(campo("seleccionarCliente").value);
  const usuario = usuarios.find(u => u.id === id && u.activo);
  campo("nombreCliente").value = usuario ? usuario.nombre : "";
  campo("emailCliente").value = usuario ? usuario.correo : "";
  campo("telefono").value = usuario ? usuario.telefono : "";
}

// Devuelve un mensaje si hay error, o "" cuando todo está correcto.
function validarSolicitud(s) {
  if (!/^09[0-9]{8}$/.test(s.telefono)) return "El teléfono debe empezar con 09 y tener 10 dígitos.";
  if (!/^[A-Z]{3}-?[0-9]{3,4}$/.test(s.placa)) return "La placa debe tener el formato ABC-1234.";
  if (String(campo("anio").value).trim() === "") return "Ingresa el año del vehículo.";
  if (!Number.isInteger(s.anio) || s.anio < 1950 || s.anio > new Date().getFullYear() + 1) return "Ingresa un año válido.";
  if (String(campo("kilometraje").value).trim() === "") return "Ingresa el kilometraje.";
  if (!Number.isInteger(s.kilometraje) || s.kilometraje < 0 || s.kilometraje > 9999999) return "El kilometraje debe ser un número entero mayor o igual a 0.";
  if (!s.marca || !s.modelo || !s.servicio) return "Completa la marca, el modelo y el servicio.";
  if (!s.fecha || s.fecha < fechaHoy()) return "La fecha no puede estar vacía ni ser pasada.";
  if (new Date(s.fecha + "T12:00:00").getDay() === 0) return "El taller no atiende los domingos.";
  if (!s.hora || s.hora < "08:00" || s.hora > "17:00") return "Elige una hora entre 08:00 y 17:00.";
  if (s.fecha === fechaHoy()) {
    const ahora = new Date();
    const horaActual = String(ahora.getHours()).padStart(2, "0") + ":" + String(ahora.getMinutes()).padStart(2, "0");
    if (s.hora <= horaActual) return "Para hoy, selecciona una hora futura.";
  }
  if (!campo("aceptoDatos").checked) return "Debes confirmar que los datos son correctos.";
  return "";
}

function registrarSolicitud(evento) {
  evento.preventDefault();
  const usuario = usuarioActual();
  if (!usuario || (idEdicion && !esAdmin())) {
    Swal.fire("Acceso denegado", "No tienes permiso para guardar esta solicitud.", "error");
    return;
  }

  let propietario = usuario;
  if (esAdmin()) {
    propietario = usuarios.find(u => u.id === Number(campo("seleccionarCliente").value) && u.activo);
  }
  if (!propietario) {
    Swal.fire("Error", "Selecciona un cliente válido.", "warning");
    return;
  }

  const solicitudes = leerSolicitudes();
  const anterior = solicitudes.find(s => s.id === idEdicion);
  if (idEdicion && !anterior) {
    Swal.fire("Error", "La solicitud ya no existe.", "error");
    return;
  }

  const solicitud = {
    id: idEdicion || Date.now(),
    usuarioId: propietario.id,
    nombreCliente: propietario.nombre,
    emailCliente: propietario.correo,
    telefono: campo("telefono").value.trim(),
    placa: campo("placa").value.trim().toUpperCase(),
    marca: campo("marca").value,
    modelo: campo("modelo").value.trim(),
    anio: Number(campo("anio").value),
    kilometraje: Number(campo("kilometraje").value),
    servicio: campo("servicio").value,
    fecha: campo("fecha").value,
    hora: campo("hora").value,
    prioridad: document.querySelector('input[name="prioridad"]:checked').value,
    lavado: campo("lavado").checked,
    revisionFluidos: campo("revisionFluidos").checked,
    observaciones: campo("observaciones").value.trim(),
    estado: anterior ? anterior.estado : "Pendiente"
  };

  const error = validarSolicitud(solicitud);
  if (error) {
    Swal.fire("Revisa los datos", error, "warning");
    return;
  }

  if (idEdicion) {
    const posicion = solicitudes.findIndex(s => s.id === idEdicion);
    solicitudes[posicion] = solicitud; // UPDATE: editar.
  } else {
    solicitudes.push(solicitud); // CREATE: registrar.
  }
  guardarSolicitudes(solicitudes);
  Swal.fire("Guardado", "La solicitud se guardó correctamente.", "success").then(function () {
    window.location.href = "cuenta.html";
  });
}

// 6. PERFIL Y LISTADOS
function agregarCelda(fila, valor) {
  const celda = fila.insertCell();
  celda.textContent = valor;
  return celda;
}

function mostrarCuenta() {
  const usuario = usuarioActual();
  if (!usuario) {
    campo("avisoCuenta").classList.remove("oculto");
    return;
  }

  campo("panelCuenta").classList.remove("oculto");
  campo("perfilNombre").textContent = usuario.nombre;
  campo("perfilCorreo").textContent = usuario.correo;
  campo("perfilRol").textContent = usuario.rol;

  const propias = leerSolicitudes().filter(s => s.usuarioId === usuario.id);
  const tabla = campo("tablaMisSolicitudes");
  tabla.innerHTML = "";

  if (propias.length === 0) tabla.innerHTML = '<tr><td colspan="5">No tienes solicitudes registradas.</td></tr>';
  for (const s of propias) {
    const fila = tabla.insertRow();
    for (const dato of [s.id, s.placa, s.servicio, s.fecha, s.estado]) agregarCelda(fila, dato);
  }

  if (esAdmin()) {
    campo("panelAdmin").classList.remove("oculto");
    mostrarAdministracion();
  }
}

// 7. CRUD DEL ADMINISTRADOR
function mostrarAdministracion() {
  if (!esAdmin()) return;
  const tabla = campo("tablaAdmin");
  const solicitudes = leerSolicitudes();
  tabla.innerHTML = "";

  if (solicitudes.length === 0) {
    tabla.innerHTML = '<tr><td colspan="7">No hay solicitudes registradas.</td></tr>';
    return;
  }

  for (const s of solicitudes) {
    const fila = tabla.insertRow();
    for (const dato of [s.id, s.nombreCliente, s.placa, s.servicio, s.fecha]) agregarCelda(fila, dato);

    // El select permite cambiar el estado.
    const selector = document.createElement("select");
    selector.className = "form-select form-select-sm select-estado";
    for (const estado of estados) {
      const opcion = document.createElement("option");
      opcion.value = estado;
      opcion.textContent = estado;
      selector.appendChild(opcion);
    }
    selector.value = s.estado;
    selector.addEventListener("change", function () { cambiarEstado(s.id, selector.value); });
    agregarCelda(fila, "").appendChild(selector);

    // Botones Editar y Eliminar.
    const acciones = agregarCelda(fila, "");
    acciones.className = "acciones";
    const editar = document.createElement("button");
    editar.className = "btn btn-primary btn-sm";
    editar.textContent = "Editar";
    editar.addEventListener("click", function () {
      window.location.href = "solicitud.html?editar=" + s.id;
    });
    acciones.appendChild(editar);

    const eliminar = document.createElement("button");
    eliminar.className = "btn btn-danger btn-sm";
    eliminar.textContent = "Eliminar";
    eliminar.addEventListener("click", function () { eliminarSolicitud(s.id); });
    acciones.appendChild(eliminar);
  }
}

function cambiarEstado(id, estado) {
  if (!esAdmin() || !estados.includes(estado)) return;
  const lista = leerSolicitudes();
  const solicitud = lista.find(s => s.id === id);
  if (!solicitud) return;
  solicitud.estado = estado;
  guardarSolicitudes(lista);
  mostrarCuenta();
  Swal.fire("Estado actualizado", "Nuevo estado: " + estado, "success");
}

function eliminarSolicitud(id) {
  if (!esAdmin()) {
    Swal.fire("Acceso denegado", "Solo el administrador puede eliminar.", "error");
    return;
  }
  Swal.fire({
    title: "¿Eliminar solicitud?",
    text: "Este registro se eliminará del navegador.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  }).then(function (respuesta) {
    if (respuesta.isConfirmed && esAdmin()) {
      const lista = leerSolicitudes().filter(s => s.id !== id);
      guardarSolicitudes(lista); // DELETE: guardar la lista sin ese registro.
      mostrarCuenta();
      Swal.fire("Eliminado", "La solicitud fue eliminada.", "success");
    }
  });
}
