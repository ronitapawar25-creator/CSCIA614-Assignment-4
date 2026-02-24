import React, { useEffect, useState } from 'react'
import { subscribeToItems, addItem as fbAddItem, updateItem as fbUpdateItem, deleteItem as fbDeleteItem, deleteAllItems as fbDeleteAllItems, onAuthStateChange, signOut } from './firebase'
import Login from './Login'

type Style = 'cool' | 'complete' | 'hot'

type Item = {
  id: string
  text: string
  style: Style
  createdAt: number
  user: string
}

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [text, setText] = useState('')
  const [user, setUser] = useState('')
  const [sortMode, setSortMode] = useState<'importance' | 'chrono' | 'user'>('chrono')
  const [newUserInput, setNewUserInput] = useState('')
  const [previousUsers, setPreviousUsers] = useState<string[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showStyleDropdown, setShowStyleDropdown] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // Check authentication state
    const unsubscribeAuth = onAuthStateChange((authUser) => {
      if (authUser) {
        setIsAuthenticated(true)
        setUserEmail(authUser.email || authUser.uid)
        setUser(authUser.email || `Guest-${authUser.uid.slice(0, 8)}`)
        localStorage.setItem('shopping_user', authUser.email || `Guest-${authUser.uid.slice(0, 8)}`)
        setAuthLoading(false)
      } else {
        setIsAuthenticated(false)
        setAuthLoading(false)
      }
    })

    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    // Load previous users from localStorage
    const saved = localStorage.getItem('previous_users')
    if (saved) {
      setPreviousUsers(JSON.parse(saved))
    }

    // Subscribe to Firebase Firestore real-time updates
    const unsubscribe = subscribeToItems((items) => {
      setItems(items)
    })

    return () => unsubscribe()
  }, [isAuthenticated])

  function handleLoginSuccess(name: string, email: string) {
    setUser(name)
    setUserEmail(email)
    localStorage.setItem('shopping_user', name)
  }

  async function handleLogout() {
    try {
      await signOut()
      setIsAuthenticated(false)
      setUser('')
      setUserEmail('')
      setItems([])
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  if (authLoading) {
    return <div className="loading-container"><div className="spinner"></div><p>Loading...</p></div>
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  function addItem(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text.trim()) return
    const item = { text: text.trim(), style: 'cool' as Style, createdAt: Date.now(), user }
    console.log('Adding item:', item)
    fbAddItem(item)
      .then(() => {
        console.log('Item added successfully')
        setText('')
      })
      .catch((err) => {
        console.error('Error adding item:', err)
      })
  }

  function deleteCompleted() {
    console.log('Deleting completed items')
    items.forEach((item) => {
      if (item.style === 'complete') {
        fbDeleteItem(item.id).catch((err) => {
          console.error('Error deleting item:', err)
        })
      }
    })
  }

  function deleteItem(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    console.log('Deleting item', id)
    fbDeleteItem(id).catch((err) => {
      console.error('Error deleting item:', err)
    })
  }

  function deleteAllList() {
    if (window.confirm('Delete entire list?')) {
      console.log('Deleting all items')
      fbDeleteAllItems().catch((err) => {
        console.error('Error deleting all items:', err)
      })
    }
  }

  function toggleComplete(itemId: string) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const newStyle = item.style === 'complete' ? 'cool' : 'complete'
    console.log('Toggling item', itemId, 'to', newStyle)
    fbUpdateItem(itemId, { style: newStyle }).then(() => {
      console.log('Item toggled successfully')
    }).catch((err) => {
      console.error('Error toggling item:', err)
    })
  }

  function setItemStyle(itemId: string, newStyle: Style) {
    console.log('Setting style for item', itemId, 'to', newStyle)
    fbUpdateItem(itemId, { style: newStyle }).then(() => {
      console.log('Item updated successfully')
      setShowStyleDropdown(null)
    }).catch((err) => {
      console.error('Error updating item:', err)
    })
  }

  function changeUserFromInput() {
    if (newUserInput.trim()) {
      setUser(newUserInput.trim())
      localStorage.setItem('shopping_user', newUserInput.trim())
      const updated = Array.from(new Set([...previousUsers, newUserInput.trim()]))
      setPreviousUsers(updated)
      localStorage.setItem('previous_users', JSON.stringify(updated))
      setNewUserInput('')
      setShowUserDropdown(false)
    }
  }

  function switchUser(selectedUser: string) {
    setUser(selectedUser)
    localStorage.setItem('shopping_user', selectedUser)
    setShowUserDropdown(false)
  }

  function saveToLocal() {
    localStorage.setItem('shopping_items', JSON.stringify(items))
    alert('List saved to local storage!')
  }

  function loadFromLocal() {
    const saved = localStorage.getItem('shopping_items')
    if (saved) {
      const parsed = JSON.parse(saved)
      parsed.forEach((item: Item) => {
        // Don't include the old UUID; let Firestore generate new IDs
        const { id, ...itemWithoutId } = item
        fbAddItem(itemWithoutId)
      })
      alert('List loaded!')
    } else {
      alert('No saved list found')
    }
  }

  function sortedItems() {
    const copy = [...items]
    if (sortMode === 'chrono') {
      return copy.sort((a, b) => a.createdAt - b.createdAt)
    }
    if (sortMode === 'user') {
      return copy.sort((a, b) => a.user.localeCompare(b.user))
    }
    // importance: hot > cool > complete
    const rank = (s: Style) => (s === 'hot' ? 2 : s === 'cool' ? 1 : 0)
    return copy.sort((a, b) => rank(b.style) - rank(a.style))
  }

  return (
    <div className="app">
      <header>
        <h1>Real-time Shopping List</h1>
        <div className="meta">
          Logged in as <strong>{user}</strong>
          <button onClick={handleLogout} className="logout-btn">Sign Out</button>
          <div className="user-selector">
            <button onClick={() => setShowUserDropdown(!showUserDropdown)} className="user-btn">
              Change User ▼
            </button>
            {showUserDropdown && (
              <div className="user-dropdown">
                <input
                  type="text"
                  value={newUserInput}
                  onChange={(e) => setNewUserInput(e.target.value)}
                  placeholder="New user name"
                  onKeyDown={(e) => e.key === 'Enter' && changeUserFromInput()}
                />
                <button onClick={changeUserFromInput} className="confirm-btn">Set User</button>
                {previousUsers.length > 0 && <div className="divider">Previous Users</div>}
                {previousUsers.map((u) => (
                  <button key={u} onClick={() => switchUser(u)} className="prev-user-btn">
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <form onSubmit={addItem} className="add-form">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add new item" />
        <button type="submit">Add</button>
      </form>

      <div className="controls">
        <button onClick={() => setSortMode('importance')}>Sort by Importance</button>
        <button onClick={() => setSortMode('chrono')}>Sort by Chrono</button>
        <button onClick={() => setSortMode('user')}>Sort by User</button>
        <button onClick={deleteCompleted} className="danger">Delete Completed</button>
        <button onClick={deleteAllList} className="danger">Delete All List</button>
        <button onClick={saveToLocal} className="primary">Save List</button>
        <button onClick={loadFromLocal} className="primary">Load List</button>
      </div>

      <ul className="items">
        {sortedItems().map(item => (
          <li key={item.id} className={`item ${item.style}`}>
            <div className="item-content">
              <div className="text">{item.text}</div>
              <div className="meta">{new Date(item.createdAt).toLocaleTimeString()} • {item.user}</div>
            </div>
            <div className="item-buttons">
              <button 
                className="status-btn complete-btn"
                onClick={() => toggleComplete(item.id)}
                title={item.style === 'complete' ? 'Uncheck' : 'Mark as complete'}
              >
                ✓
              </button>
              <div className="style-dropdown-wrapper">
                <button 
                  className="style-btn"
                  onClick={() => setShowStyleDropdown(showStyleDropdown === item.id ? null : item.id)}
                >
                  {item.style === 'cool' ? '❄️ Cool' : item.style === 'hot' ? '🔥 Hot' : '✓ Complete'} ▼
                </button>
                {showStyleDropdown === item.id && (
                  <div className="style-dropdown">
                    <button onClick={() => setItemStyle(item.id, 'cool')} className="style-option">
                      ❄️ Cool
                    </button>
                    <button onClick={() => setItemStyle(item.id, 'hot')} className="style-option">
                      🔥 Hot
                    </button>
                  </div>
                )}
              </div>
              <button className="delete-btn" onClick={(e) => deleteItem(item.id, e)}>×</button>
            </div>
          </li>
        ))}
      </ul>

      <footer>
        <small>Use buttons to set item status. ✓ = Complete, ❄️ = Cool, 🔥 = Hot</small>
      </footer>
    </div>
  )
}
