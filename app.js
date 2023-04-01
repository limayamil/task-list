const express = require("express");
const mongoose = require("mongoose");

// Conexión con la BD
mongoose.connect('mongodb+srv://yamillues:k4PlrvEjoe8NtY5U@task-list-yl.6kak1nf.mongodb.net/test', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conexión exitosa a la BD'))
    .catch(err => console.error(err));

// Definición del esquema de tareas
const taskSchema = new mongoose.Schema({
    title: String,
    completed: Boolean,
    deleted: Boolean
})

// Creación del modelo de tareas
const Task = mongoose.model('Task', taskSchema);

// Configuración de Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Definición de las rutas
app.get('/tasks', async (req, res) => {
    const tasks = await Task.find();
    res.send(tasks);
});

app.post('/tasks', async (req, res) => {
    const task = new Task({
        title: req.body.title;
        completed: false,
        deleted: false
    });
    await task.save();
    res.send(task);
});

app.patch('/tasks/:id', async (req, res) => {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body);
    res.send(task);
});

// Inicio del servidor
const server = app.listen(3000, () => {
    console.log('Servicio iniciado en el puerto 3000. ¡Bienvenido!');
});

// Configuración de Socket.io
const io = require('socket.io')(server);

io.on('connection', socket => {
    console.log('Usuario conectado');

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });

    socket.on('addTask', async task => {
        const newTask = new Task({
            title: task.title,
            completed: false,
            deleted: false
        });
        await newTask.save();
        io.emit('newTask', newTask);
    });

    socket.on('updateTask', async task => {
        const updatedTask = await Task.findByIdAndUpdate(task._id, task);
        io.emit('updatedTask', updatedTask);
    });
});

const socket = io();

const form = document.querySelector('#add-task-form');
const input = document.querySelector('#add-task-form input');
const taskList = document.querySelector('#task-list');

form.addEventListener('submit', event => {
  event.preventDefault();

  const title = input.value.trim();
  if (title === '') {
    return;
  }

  socket.emit('addTask', { title });
  input.value = '';
});

socket.on('newTask', task => {
  const li = document.createElement('li');
  li.dataset.id = task._id;

  const titleSpan = document.createElement('span');
  titleSpan.textContent = task.title;

  const completeButton = document.createElement('button');
  completeButton.textContent = 'Completada';

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Eliminar';

  li.appendChild(titleSpan);
  li.appendChild(completeButton);
  li.appendChild(deleteButton);
  taskList.appendChild(li);

  completeButton.addEventListener('click', event => {
    const li = event.target.parentNode;
    const id = li.dataset.id;
    const completed = !li.classList.contains('completed');
    li.classList.toggle('completed');

    socket.emit('updateTask', { _id: id, completed, deleted: false });
  });

  deleteButton.addEventListener('click', event => {
    const li = event.target.parentNode;
    const id = li.dataset.id;
    li.remove();

    socket.emit('updateTask', { _id: id, completed: false, deleted: true });
  });
});

socket.on('updatedTask', task => {
  const li = taskList.querySelector(`[data-id="${task._id}"]`);
  const titleSpan = li.querySelector('span');
  const completeButton = li.querySelector('button:nth-of-type(1)');

  titleSpan.textContent = task.title;

  if (task.completed) {
    li.classList.add('completed');
    completeButton.textContent = 'Reactivar';
  } else {
    li.classList.remove('completed');
    completeButton.textContent = 'Completada';
  }
});

socket.on('connect', () => {
  console.log('Conectado al servidor');
});

socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
});

(async function() {
  const response = await fetch('/tasks');
  const tasks = await response.json();
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.dataset.id = task._id;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = task.title;

    const completeButton = document.createElement('button');
    completeButton.textContent = task.completed ? 'Reactivar' : 'Completada';

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Eliminar';

    if (task.completed) {
      li.classList.add('completed');
    }

    li.appendChild(titleSpan);
    li.appendChild(completeButton);
    li.appendChild(deleteButton);
    taskList.appendChild(li);

    completeButton.addEventListener('click', event => {
      const li = event.target.parentNode;
      const id = li.dataset.id;
      const completed = !li.classList.contains('completed');
      li.classList.toggle('completed');

      socket.emit('updateTask', { _id: id, completed, deleted: false });
    });

    deleteButton.addEventListener('click', event => {
      const li = event.target.parentNode;
      const id = li.dataset.id;
      li.remove();

      socket.emit('updateTask', { _id: id, completed: false, deleted: true });
    });
  });
})();