import React, { useEffect, useState } from 'react'
import { subscribeToItems, addItem as fbAddItem, updateItem as fbUpdateItem, deleteItem as fbDeleteItem, deleteAllItems as fbDeleteAllItems, onAuthStateChange, signOut, logDeletion, subscribeToLatestDeletion } from './firebase'
import Login from './Login'

type Style = 'cool' | 'complete' | 'hot'

type Item = {
  id: string
  text: string
  style: Style
  createdAt: number
  user: string
  userId: string
}

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [text, setText] = useState('')
  const [user, setUser] = useState('')
  const [userId, setUserId] = useState('')
  const [sortMode, setSortMode] = useState<'importance' | 'chrono' | 'user'>('chrono')
  const [showStyleDropdown, setShowStyleDropdown] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [isGoogleUser, setIsGoogleUser] = useState(false)
  const [lastDeletionLog, setLastDeletionLog] = useState<any>(null)

  useEffect(() => {
    // Check authentication state
    const unsubscribeAuth = onAuthStateChange((authUser) => {
      if (authUser) {
        setIsAuthenticated(true)
        setUserEmail(authUser.email || authUser.uid)
        setUserId(authUser.uid)
        setUser(authUser.email || `Guest-${authUser.uid.slice(0, 8)}`)
        
        // Check if user is Google authenticated
        const isGoogle = authUser.providerData.some(profile => profile.providerId === 'google.com')
        setIsGoogleUser(isGoogle)
        
        setAuthLoading(false)
      } else {
        setIsAuthenticated(false)
        setIsGoogleUser(false)
        setAuthLoading(false)
      }
    })

    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !userId) return

    // Subscribe to Firebase Firestore real-time updates (filtered by user)
    const unsubscribe = subscribeToItems(userId, (items) => {
      setItems(items)
    })

    return () => unsubscribe()
  }, [isAuthenticated, userId])

  useEffect(() => {
    // Subscribe to deletion logs
    const unsubscribe = subscribeToLatestDeletion((log) => {
      setLastDeletionLog(log)
    })

    return () => unsubscribe()
  }, [])

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
    const item = { text: text.trim(), style: 'cool' as Style, createdAt: Date.now(), user, userId }
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
      if (item.style === 'complete' && item.userId === userId) {
        fbDeleteItem(item.id).catch((err) => {
          console.error('Error deleting item:', err)
        })
      }
    })
  }

  function deleteItem(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const item = items.find(i => i.id === id)
    if (item && item.userId !== userId) {
      alert("You can only delete your own items")
      return
    }
    console.log('Deleting item', id)
    fbDeleteItem(id).catch((err) => {
      console.error('Error deleting item:', err)
    })
  }

  function deleteAllList() {
    if (!isGoogleUser) {
      alert('Only users who logged in with Gmail can delete the entire list')
      return
    }
    const userItems = items.filter(item => item.userId === userId)
    if (userItems.length === 0) {
      alert('You have no items to delete')
      return
    }
    if (window.confirm('Delete all YOUR items?')) {
      console.log('Deleting all user items')
      // Log the deletion
      logDeletion(userId, user)
      userItems.forEach((item) => {
        fbDeleteItem(item.id).catch((err) => {
          console.error('Error deleting item:', err)
        })
      })
    }
  }

  function toggleComplete(itemId: string) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    if (item.userId !== userId) {
      alert("You can only modify your own items")
      return
    }
    const newStyle = item.style === 'complete' ? 'cool' : 'complete'
    console.log('Toggling item', itemId, 'to', newStyle)
    fbUpdateItem(itemId, { style: newStyle }).then(() => {
      console.log('Item toggled successfully')
    }).catch((err) => {
      console.error('Error toggling item:', err)
    })
  }

  function setItemStyle(itemId: string, newStyle: Style) {
    const item = items.find(i => i.id === itemId)
    if (item && item.userId !== userId) {
      alert("You can only modify your own items")
      return
    }
    console.log('Setting style for item', itemId, 'to', newStyle)
    fbUpdateItem(itemId, { style: newStyle }).then(() => {
      console.log('Item updated successfully')
      setShowStyleDropdown(null)
    }).catch((err) => {
      console.error('Error updating item:', err)
    })
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
        <button 
          onClick={deleteAllList} 
          className="danger" 
          disabled={!isGoogleUser}
          title={isGoogleUser ? "Delete all your items" : "Only Gmail users can delete all items"}
        >
          Delete All List{!isGoogleUser ? ' (Gmail only)' : ''}
        </button>
        <button onClick={saveToLocal} className="primary">Save List</button>
        <button onClick={loadFromLocal} className="primary">Load List</button>
      </div>

      <ul className="items">
        {sortedItems().map(item => {
          const isOwner = item.userId === userId
          return (
            <li key={item.id} className={`item ${item.style}${isOwner ? '' : ' readonly'}`}>
              <div className="item-content">
                <div className="text">{item.text}</div>
                <div className="meta">{new Date(item.createdAt).toLocaleTimeString()} • {item.user}{!isOwner ? ' (read-only)' : ''}</div>
              </div>
              <div className="item-buttons">
                <button 
                  className="status-btn complete-btn"
                  onClick={() => toggleComplete(item.id)}
                  title={isOwner ? (item.style === 'complete' ? 'Uncheck' : 'Mark as complete') : 'Read-only'}
                  disabled={!isOwner}
                >
                  ✓
                </button>
                <div className="style-dropdown-wrapper">
                  <button 
                    className="style-btn"
                    onClick={() => setShowStyleDropdown(showStyleDropdown === item.id ? null : item.id)}
                    disabled={!isOwner}
                  >
                    {item.style === 'cool' ? '❄️ Cool' : item.style === 'hot' ? '🔥 Hot' : '✓ Complete'} ▼
                  </button>
                  {showStyleDropdown === item.id && isOwner && (
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
                <button className="delete-btn" onClick={(e) => deleteItem(item.id, e)} disabled={!isOwner}>×</button>
              </div>
            </li>
          )
        })}
      </ul>

      <footer>
        <small>Use buttons to set item status. ✓ = Complete, ❄️ = Cool, 🔥 = Hot</small>
        {lastDeletionLog && (
          <div className="deletion-log">
            <small>Last deletion: {lastDeletionLog.userName} deleted all items at {lastDeletionLog.timestamp}</small>
          </div>
        )}
      </footer>
    </div>
  )
}
