   'use client'

   import { useEffect, useState } from 'react'
   import { useRouter } from 'next/navigation'
   import { supabase } from '@/lib/supabase'

   type Trip = {
     id: string
     name: string
     description: string | null
     created_at: string
   }

   type PendingInvite = {
     member_id: string
     trip: Trip
   }

   export default function Home() {
     const router = useRouter()
     const [loading, setLoading] = useState(true)
     const [userId, setUserId] = useState<string | null>(null)
     const [trips, setTrips] = useState<Trip[]>([])
     const [pending, setPending] = useState<PendingInvite[]>([])
     const [name, setName] = useState('')
     const [description, setDescription] = useState('')
     const [message, setMessage] = useState('')

     useEffect(() => {
       supabase.auth.getSession().then(({ data }) => {
         if (!data.session) {
           router.push('/login')
         } else {
           setUserId(data.session.user.id)
           setLoading(false)
         }
       })
     }, [router])

     useEffect(() => {
       if (userId) {
         fetchTrips()
         fetchPendingInvites()
       }
     }, [userId])

     async function fetchTrips() {
       const { data: memberRows } = await supabase
         .from('trip_members')
         .select('trip_id')
         .eq('user_id', userId)
         .eq('status', 'accepted')

       const tripIds = (memberRows ?? []).map((m) => m.trip_id)
       if (tripIds.length === 0) {
         setTrips([])
         return
       }

       const { data, error } = await supabase
         .from('trips')
         .select('*')
         .in('id', tripIds)
         .order('created_at', { ascending: false })

       if (error) {
         setMessage(`Error loading trips: ${error.message}`)
       } else {
         setTrips(data)
       }
     }

     async function fetchPendingInvites() {
       const { data: memberRows } = await supabase
         .from('trip_members')
         .select('id, trip_id')
         .eq('user_id', userId)
         .eq('status', 'invited')

       if (!memberRows || memberRows.length === 0) {
         setPending([])
         return
       }

       const tripIds = memberRows.map((m) => m.trip_id)
       const { data: tripsData } = await supabase
         .from('trips')
         .select('*')
         .in('id', tripIds)

       const combined = memberRows.map((m) => ({
         member_id: m.id,
         trip: (tripsData ?? []).find((t) => t.id === m.trip_id)!,
       })).filter((p) => p.trip)

       setPending(combined)
     }

     async function respondToInvite(memberId: string, accept: boolean) {
       const { error } = await supabase
         .from('trip_members')
         .update({
           status: accept ? 'accepted' : 'declined',
           joined_at: accept ? new Date().toISOString() : null,
         })
         .eq('id', memberId)

       if (!error) {
         fetchPendingInvites()
         fetchTrips()
       }
     }

     async function handleCreateTrip() {
       if (!name.trim()) {
         setMessage('Trip name is required.')
         return
       }

       const { error } = await supabase.from('trips').insert({
         name,
         description,
         created_by: userId,
       })

       if (error) {
         setMessage(`Error: ${error.message}`)
       } else {
         setMessage('Trip created!')
         setName('')
         setDescription('')
         fetchTrips()
       }
     }

     if (loading) {
       return <main style={{ padding: '2rem' }}>Loading...</main>
     }

     return (
       <main style={{ padding: '2rem', maxWidth: '500px' }}>
         <h1>Your Trips</h1>

         {pending.length > 0 && (
           <div style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid orange' }}>
             <h2>Pending Invites</h2>
             {pending.map((p) => (
               <div key={p.member_id} style={{ margin: '0.5rem 0' }}>
                 <strong>{p.trip.name}</strong>
                 <button onClick={() => respondToInvite(p.member_id, true)} style={{ marginLeft: '1rem' }}>
                   Accept
                 </button>
                 <button onClick={() => respondToInvite(p.member_id, false)} style={{ marginLeft: '0.5rem' }}>
                   Decline
                 </button>
               </div>
             ))}
           </div>
         )}

         <div style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid #333' }}>
           <h2>Create a new trip</h2>
           <input
             type="text"
             placeholder="Trip name"
             value={name}
             onChange={(e) => setName(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%' }}
           />
           <textarea
             placeholder="Description (optional)"
             value={description}
             onChange={(e) => setDescription(e.target.value)}
             style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '100%' }}
           />
           <button onClick={handleCreateTrip} style={{ padding: '0.5rem 1rem' }}>
             Create Trip
           </button>
           <p>{message}</p>
         </div>

         <h2>Existing trips</h2>
         {trips.length === 0 ? (
           <p>No trips yet.</p>
         ) : (
           <ul>
             {trips.map((trip) => (
               <li key={trip.id} style={{ margin: '0.5rem 0' }}>
                 <a href={`/trips/${trip.id}`} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                   <strong>{trip.name}</strong>
                 </a>
                 {trip.description ? ` — ${trip.description}` : ''}
               </li>
             ))}
           </ul>
         )}
       </main>
     )
   }