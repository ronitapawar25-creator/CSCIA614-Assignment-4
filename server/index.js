const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

let items = []

io.on('connection', (socket) => {
  console.log('client connected', socket.id)
  socket.emit('init', items)

  socket.on('addItem', (item) => {
    items.push(item)
    io.emit('itemAdded', item)
  })

  socket.on('updateItem', (updated) => {
    items = items.map(i => i.id === updated.id ? updated : i)
    io.emit('itemUpdated', updated)
  })

  socket.on('deleteCompleted', () => {
    items = items.filter(i => i.style !== 'complete')
    console.log('Deleted completed items, remaining:', items.length)
    io.emit('deletedCompleted')
  })

  socket.on('deleteItem', (id) => {
    items = items.filter(i => i.id !== id)
    console.log('Deleted item:', id)
    io.emit('itemDeleted', id)
  })

  socket.on('deleteAllList', () => {
    items = []
    console.log('Deleted all items')
    io.emit('deletedAll')
  })

  socket.on('loadItems', (loaded) => {
    items = loaded
    console.log('Items loaded from client:', items.length)
    io.emit('init', items)
  })

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log('Server listening on', PORT))
