   'use client'

   import { useEffect, useState } from 'react'
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

   export default function TripPage() {
     const params = useParams()
     const router = useRouter()
     const tripId = params.id as string

     const [trip, setTrip] = useState<Trip | null>(null)
     const [members, setMembers] = useState<Member[]>([])
     const [items, setItems] = useState<ItineraryItem[]>([])
     const [loading, setLoading] = useState(true)
     const [notFound, setNotFound] = useState(false)
     const [inviteEmail, setInviteEmail] = useState('')
     const [message, setMessage] = useState('')

     const [itemDay, setItemDay] = useState('')
     const [itemTime, setItemTime] = useState('')
     const [itemTitle, setItemTitle] = useState('')
     const [itemNotes, setItemNotes] = useState('')
     const [itineraryMessage, setItineraryMessage] = useState('')

     useEffect(() => {
       supabase.auth.getSession().then(({ data }) => {
         if (!data.session) {
           router.push('/login')
         } else {
           fetchTrip()
           fetchMembers()
           fetchItinerary()
         }
       })
     }, [tripId])

     async function fetchTrip() {
       const { data, error } = await supabase
         .from('trips')
         .select('*')
         .eq('id', tripId)
         .single()

       if (error || !data) {
         setNotFound(true)
       } else {
         setTrip(data)
       }
       setLoading(false)
     }

     async function fetchMembers() {
       const { data, error } = await supabase
         .from('trip_members')
         .select('*')
         .eq('trip_id', tripId)

       if (!error && data) {
         setMembers(data)
       }
     }

     async function fetchItinerary() {
       const { data, error } = await supabase
         .from('itinerary_items')
         .select('*')
         .eq('trip_id', tripId)
         .order('day', { ascending: true })
         .order('start_time', { ascending: true })

       if (!error && data) {
         setItems(data)
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
         created_by: (await supabase.auth.getUser()).data.user?.id,
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
       if (!error) {
         fetchItinerary()
       }
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

     if (loading) return <main style={{ padding: '2rem' }}>Loading...</main>
     if (notFound) return <main style={{ padding: '2rem' }}>Trip not found.</main>

     return (
       <main style={{ padding: '2rem', maxWidth: '600px' }}>
         <h1>{trip?.name}</h1>
         <p>{trip?.description}</p>
         <hr style={{ margin: '1.5rem 0' }} />

         <h2>Members</h2>
         <ul>
           {members.map((m) => (
             <li key={m.id}>
               {m.invited_email || m.user_id} — {m.role} ({m.status})
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
           <button onClick={handleInvite} style={{ padding: '0.5rem 1rem' }}>
             Send Invite
           </button>
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
               <button onClick={() => handleDeleteItem(item.id)} style={{ marginLeft: '1rem' }}>
                 Delete
               </button>
             </li>
           ))}
         </ul>

         <div style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid #333' }}>
           <h3>Add itinerary item</h3>
           <input
             type="date"
             value={itemDay}
             onChange={(e) => setItemDay(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem' }}
           />
           <input
             type="time"
             value={itemTime}
             onChange={(e) => setItemTime(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem' }}
           />
           <input
             type="text"
             placeholder="Title (e.g. Visit Nandi Hills)"
             value={itemTitle}
             onChange={(e) => setItemTitle(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%' }}
           />
           <textarea
             placeholder="Notes (optional)"
             value={itemNotes}
             onChange={(e) => setItemNotes(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%' }}
           />
           <button onClick={handleAddItem} style={{ padding: '0.5rem 1rem' }}>
             Add Item
           </button>
           <p>{itineraryMessage}</p>
         </div>

         <hr style={{ margin: '1.5rem 0' }} />
         <p><em>Expenses, chat, and photos will go here.</em></p>
       </main>
     )
   }