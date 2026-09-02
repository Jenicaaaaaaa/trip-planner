   'use client'

   import { useEffect, useState, useRef } from 'react'
   import { useParams, useRouter } from 'next/navigation'
   import { supabase } from '@/lib/supabase'

   type Trip = {
     id: string
     name: string
     description: string | null
     created_by: string
   }

   type Member = {
     id: string
     user_id: string | null
     invited_email: string | null
     role: string
     status: string
   }

   type ItineraryItem = {
     id: string
     day: string | null
     start_time: string | null
     title: string
     notes: string | null
   }

   type Expense = {
     id: string
     paid_by: string
     amount: number
     description: string | null
   }

   type ExpenseSplit = {
     expense_id: string
     user_id: string
     share_amount: number
   }

   type Settlement = {
     from: string
     to: string
     amount: number
   }

    type ChatMessage = {
     id: string
     sender_id: string
     content: string
     created_at: string
   }

  type Photo = {
     id: string
     storage_path: string
     uploaded_by: string
     caption: string | null
   }

   export default function TripPage() {
     const params = useParams()
     const router = useRouter()
     const tripId = params.id as string

     const [trip, setTrip] = useState<Trip | null>(null)
     const [members, setMembers] = useState<Member[]>([])
     const [items, setItems] = useState<ItineraryItem[]>([])
     const [expenses, setExpenses] = useState<Expense[]>([])
     const [splits, setSplits] = useState<ExpenseSplit[]>([])
     const [profileMap, setProfileMap] = useState<Record<string, string>>({})
     const [loading, setLoading] = useState(true)
     const [notFound, setNotFound] = useState(false)
     const [inviteEmail, setInviteEmail] = useState('')
     const [message, setMessage] = useState('')
     const [currentUserId, setCurrentUserId] = useState<string | null>(null)

     const [itemDay, setItemDay] = useState('')
     const [itemTime, setItemTime] = useState('')
     const [itemTitle, setItemTitle] = useState('')
     const [itemNotes, setItemNotes] = useState('')
     const [itineraryMessage, setItineraryMessage] = useState('')

     const [expAmount, setExpAmount] = useState('')
     const [expDescription, setExpDescription] = useState('')
     const [expSplitWith, setExpSplitWith] = useState<string[]>([])
     const [expMessage, setExpMessage] = useState('')

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const chatEndRef = useRef<HTMLDivElement>(null)

    const [photos, setPhotos] = useState<Photo[]>([])
    const [uploading, setUploading] = useState(false)
    const [photoMessage, setPhotoMessage] = useState('')

     useEffect(() => {
       supabase.auth.getSession().then(({ data }) => {
         if (!data.session) {
           router.push('/login')
         } else {
           setCurrentUserId(data.session.user.id)
           fetchTrip()
           fetchMembers()
           fetchItinerary()
           fetchExpensesAndSplits()
           fetchChatMessages()
           fetchPhotos()
         }
       })
     }, [tripId])

        useEffect(() => {
     const channel = supabase
       .channel(`chat:${tripId}`)
       .on(
         'postgres_changes',
         { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `trip_id=eq.${tripId}` },
         (payload) => {
           setChatMessages((prev) => [...prev, payload.new as ChatMessage])
         }
       )
       .subscribe()

     return () => {
       supabase.removeChannel(channel)
     }
   }, [tripId])

      useEffect(() => {
     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
   }, [chatMessages])


     async function fetchTrip() {
       const { data, error } = await supabase.from('trips').select('*').eq('id', tripId).single()
       if (error || !data) {
         setNotFound(true)
       } else {
         setTrip(data)
       }
       setLoading(false)
     }

     async function fetchMembers() {
       const { data, error } = await supabase.from('trip_members').select('*').eq('trip_id', tripId)
       if (!error && data) {
         setMembers(data)
         const ids = data.map((m) => m.user_id).filter(Boolean) as string[]
         if (ids.length > 0) fetchProfiles(ids)
       }
     }

     async function fetchProfiles(ids: string[]) {
       const { data, error } = await supabase.from('profiles').select('id, email').in('id', ids)
       if (!error && data) {
         const map: Record<string, string> = {}
         data.forEach((p) => { map[p.id] = p.email })
         setProfileMap(map)
       }
     }

    async function fetchPhotos() {
     const { data, error } = await supabase
       .from('photos')
       .select('*')
       .eq('trip_id', tripId)
       .order('created_at', { ascending: false })
     if (!error && data) setPhotos(data)
   }

   function getPhotoUrl(path: string) {
     const { data } = supabase.storage.from('trip-photos').getPublicUrl(path)
     return data.publicUrl
   }

   async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
     const file = e.target.files?.[0]
     if (!file) return

     setUploading(true)
     setPhotoMessage('')

     const fileExt = file.name.split('.').pop()
     const filePath = `${tripId}/${crypto.randomUUID()}.${fileExt}`

     const { error: uploadError } = await supabase.storage
       .from('trip-photos')
       .upload(filePath, file)

     if (uploadError) {
       setPhotoMessage(`Error: ${uploadError.message}`)
       setUploading(false)
       return
     }

     const { error: insertError } = await supabase.from('photos').insert({
       trip_id: tripId,
       uploaded_by: currentUserId,
       storage_path: filePath,
     })

     if (insertError) {
       setPhotoMessage(`Error: ${insertError.message}`)
     } else {
       setPhotoMessage('Photo uploaded!')
       fetchPhotos()
     }

     setUploading(false)
   }
    
     function displayName(userId: string | null) {
       if (!userId) return 'Unknown'
       if (userId === currentUserId) return 'You'
       return profileMap[userId] || userId
     }

     async function fetchItinerary() {
       const { data, error } = await supabase
         .from('itinerary_items')
         .select('*')
         .eq('trip_id', tripId)
         .order('day', { ascending: true })
         .order('start_time', { ascending: true })
       if (!error && data) setItems(data)
     }

     async function fetchExpensesAndSplits() {
       const { data: expenseData, error: expenseError } = await supabase
         .from('expenses')
         .select('*')
         .eq('trip_id', tripId)
         .order('created_at', { ascending: false })
       if (!expenseError && expenseData) setExpenses(expenseData)

       const { data: splitData, error: splitError } = await supabase
         .from('expense_splits')
         .select('*')
         .in('expense_id', (expenseData ?? []).map((e) => e.id))
       if (!splitError && splitData) setSplits(splitData)
     }

    async function fetchChatMessages() {
     const { data, error } = await supabase
       .from('chat_messages')
       .select('*')
       .eq('trip_id', tripId)
       .order('created_at', { ascending: true })
     if (!error && data) setChatMessages(data)
   }
    
        async function handleSendMessage() {
     if (!chatInput.trim()) return
     const { error } = await supabase.from('chat_messages').insert({
       trip_id: tripId,
       sender_id: currentUserId,
       content: chatInput.trim(),
     })
     if (!error) {
       setChatInput('')
     }
   }

     async function handleAddItem() {
       if (!itemTitle.trim()) {
         setItineraryMessage('Title is required.')
         return
       }
       const { error } = await supabase.from('itinerary_items').insert({
         trip_id: tripId,
         day: itemDay || null,
         start_time: itemTime || null,
         title: itemTitle,
         notes: itemNotes || null,
         created_by: currentUserId,
       })
       if (error) {
         setItineraryMessage(`Error: ${error.message}`)
       } else {
         setItineraryMessage('Item added!')
         setItemDay('')
         setItemTime('')
         setItemTitle('')
         setItemNotes('')
         fetchItinerary()
       }
     }

     async function handleDeleteItem(id: string) {
       const { error } = await supabase.from('itinerary_items').delete().eq('id', id)
       if (!error) fetchItinerary()
     }

     async function handleInvite() {
       if (!inviteEmail.trim()) {
         setMessage('Enter an email address.')
         return
       }
       const { data: existingProfile } = await supabase
         .from('profiles')
         .select('id')
         .eq('email', inviteEmail.trim())
         .maybeSingle()

       const { error } = await supabase.from('trip_members').insert({
         trip_id: tripId,
         user_id: existingProfile?.id ?? null,
         invited_email: inviteEmail.trim(),
         role: 'editor',
         status: 'invited',
       })

       if (error) {
         setMessage(`Error: ${error.message}`)
       } else {
         setMessage(`Invited ${inviteEmail}`)
         setInviteEmail('')
         fetchMembers()
       }
     }

     function toggleSplitMember(userId: string) {
       setExpSplitWith((prev) =>
         prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
       )
     }

     async function handleAddExpense() {
       const amountNum = parseFloat(expAmount)
       if (!amountNum || amountNum <= 0) {
         setExpMessage('Enter a valid amount.')
         return
       }
       if (expSplitWith.length === 0) {
         setExpMessage('Select at least one person to split with.')
         return
       }

       const { data: expenseRow, error: expenseError } = await supabase
         .from('expenses')
         .insert({
           trip_id: tripId,
           paid_by: currentUserId,
           amount: amountNum,
           description: expDescription || null,
         })
         .select()
         .single()

       if (expenseError || !expenseRow) {
         setExpMessage(`Error: ${expenseError?.message}`)
         return
       }

       const shareAmount = Math.round((amountNum / expSplitWith.length) * 100) / 100
       const splitRows = expSplitWith.map((userId) => ({
         expense_id: expenseRow.id,
         user_id: userId,
         share_amount: shareAmount,
       }))

       const { error: splitError } = await supabase.from('expense_splits').insert(splitRows)

       if (splitError) {
         setExpMessage(`Error saving splits: ${splitError.message}`)
       } else {
         setExpMessage('Expense added!')
         setExpAmount('')
         setExpDescription('')
         setExpSplitWith([])
         fetchExpensesAndSplits()
       }
     }

     // ---- SETTLE-UP ALGORITHM ----
     function calculateSettlements(): Settlement[] {
       const balance: Record<string, number> = {}

       expenses.forEach((exp) => {
         balance[exp.paid_by] = (balance[exp.paid_by] || 0) + Number(exp.amount)
       })
       splits.forEach((s) => {
         balance[s.user_id] = (balance[s.user_id] || 0) - Number(s.share_amount)
       })

       const creditors = Object.entries(balance)
         .filter(([, amt]) => amt > 0.01)
         .map(([id, amt]) => ({ id, amt }))
         .sort((a, b) => b.amt - a.amt)

       const debtors = Object.entries(balance)
         .filter(([, amt]) => amt < -0.01)
         .map(([id, amt]) => ({ id, amt: -amt }))
         .sort((a, b) => b.amt - a.amt)

       const settlements: Settlement[] = []
       let i = 0, j = 0

       while (i < debtors.length && j < creditors.length) {
         const payAmount = Math.min(debtors[i].amt, creditors[j].amt)
         settlements.push({
           from: debtors[i].id,
           to: creditors[j].id,
           amount: Math.round(payAmount * 100) / 100,
         })

         debtors[i].amt -= payAmount
         creditors[j].amt -= payAmount

         if (debtors[i].amt < 0.01) i++
         if (creditors[j].amt < 0.01) j++
       }

       return settlements
     }

     if (loading) return <main style={{ padding: '2rem' }}>Loading...</main>
     if (notFound) return <main style={{ padding: '2rem' }}>Trip not found.</main>

     const acceptedMembers = members.filter((m) => m.status === 'accepted' && m.user_id)
     const settlements = calculateSettlements()

     return (
       <main style={{ padding: '2rem', maxWidth: '600px' }}>
         <h1>{trip?.name}</h1>
         <p>{trip?.description}</p>
         <hr style={{ margin: '1.5rem 0' }} />

         <h2>Members</h2>
         <ul>
           {members.map((m) => (
             <li key={m.id}>
               {m.user_id ? displayName(m.user_id) : m.invited_email} — {m.role} ({m.status})
             </li>
           ))}
         </ul>

         <div style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid #333' }}>
           <h3>Invite a friend</h3>
           <input
             type="email"
             placeholder="Friend's email"
             value={inviteEmail}
             onChange={(e) => setInviteEmail(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%', maxWidth: '300px' }}
           />
           <button onClick={handleInvite} style={{ padding: '0.5rem 1rem' }}>Send Invite</button>
           <p>{message}</p>
         </div>

         <hr style={{ margin: '1.5rem 0' }} />

         <h2>Itinerary</h2>
         <ul>
           {items.map((item) => (
             <li key={item.id} style={{ margin: '0.5rem 0' }}>
               <strong>{item.day || 'No date'}</strong>
               {item.start_time ? ` at ${item.start_time}` : ''}
               {' — '}{item.title}
               {item.notes ? ` (${item.notes})` : ''}
               <button onClick={() => handleDeleteItem(item.id)} style={{ marginLeft: '1rem' }}>Delete</button>
             </li>
           ))}
         </ul>

         <div style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid #333' }}>
           <h3>Add itinerary item</h3>
           <input type="date" value={itemDay} onChange={(e) => setItemDay(e.target.value)} style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem' }} />
           <input type="time" value={itemTime} onChange={(e) => setItemTime(e.target.value)} style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem' }} />
           <input type="text" placeholder="Title (e.g. Visit Nandi Hills)" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%' }} />
           <textarea placeholder="Notes (optional)" value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%' }} />
           <button onClick={handleAddItem} style={{ padding: '0.5rem 1rem' }}>Add Item</button>
           <p>{itineraryMessage}</p>
         </div>

         <hr style={{ margin: '1.5rem 0' }} />

         <h2>Expenses</h2>
         <ul>
           {expenses.map((exp) => (
             <li key={exp.id} style={{ margin: '0.5rem 0' }}>
               ₹{exp.amount} — {exp.description || 'No description'} (paid by {displayName(exp.paid_by)})
             </li>
           ))}
         </ul>

         <div style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid #333' }}>
           <h3>Add an expense</h3>
           <input
             type="number"
             placeholder="Amount (₹)"
             value={expAmount}
             onChange={(e) => setExpAmount(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%' }}
           />
           <input
             type="text"
             placeholder="Description (e.g. Dinner)"
             value={expDescription}
             onChange={(e) => setExpDescription(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%' }}
           />
           <p style={{ marginBottom: '0.25rem' }}>Split with:</p>
           {acceptedMembers.map((m) => (
             <label key={m.user_id} style={{ display: 'block', margin: '0.25rem 0' }}>
               <input
                 type="checkbox"
                 checked={expSplitWith.includes(m.user_id!)}
                 onChange={() => toggleSplitMember(m.user_id!)}
               />
               {' '}{displayName(m.user_id)}
             </label>
           ))}
           <button onClick={handleAddExpense} style={{ padding: '0.5rem 1rem', marginTop: '0.5rem' }}>Add Expense</button>
           <p>{expMessage}</p>
         </div>

         <hr style={{ margin: '1.5rem 0' }} />

         <h2>Settle Up</h2>
         {settlements.length === 0 ? (
           <p>Everyone's settled up.</p>
         ) : (
           <ul>
             {settlements.map((s, idx) => (
               <li key={idx} style={{ margin: '0.5rem 0' }}>
                 <strong>{displayName(s.from)}</strong> owes <strong>{displayName(s.to)}</strong> ₹{s.amount}
               </li>
             ))}
           </ul>
         )}

             <hr style={{ margin: '1.5rem 0' }} />

    <h2>Chat</h2>
    <div style={{ border: '1px solid #333', height: '250px', overflowY: 'auto', padding: '1rem', marginBottom: '1rem' }}>
      {chatMessages.map((msg) => (
        <div key={msg.id} style={{ margin: '0.5rem 0' }}>
          <strong>{displayName(msg.sender_id)}:</strong> {msg.content}
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <input
        type="text"
        placeholder="Type a message..."
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage() }}
        style={{ flex: 1, padding: '0.5rem' }}
      />
      <button onClick={handleSendMessage} style={{ padding: '0.5rem 1rem' }}>Send</button>
    </div>

       <hr style={{ margin: '1.5rem 0' }} />

   <h2>Shared Photo Album</h2>
   <input
     type="file"
     accept="image/*"
     onChange={handlePhotoUpload}
     disabled={uploading}
     style={{ marginBottom: '1rem' }}
   />
   <p>{uploading ? 'Uploading...' : photoMessage}</p>
   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
     {photos.map((photo) => (
       <img
         key={photo.id}
         src={getPhotoUrl(photo.storage_path)}
         alt="Trip photo"
         style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px' }}
       />
     ))}
   </div>

       </main>
     )
   }