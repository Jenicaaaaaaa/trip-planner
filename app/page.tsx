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

   export default function Home() {
     const router = useRouter()
     const [loading, setLoading] = useState(true)
     const [userId, setUserId] = useState<string | null>(null)
     const [trips, setTrips] = useState<Trip[]>([])
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
       }
     }, [userId])

     async function fetchTrips() {
       const { data, error } = await supabase
         .from('trips')
         .select('*')
         .order('created_at', { ascending: false })

       if (error) {
         setMessage(`Error loading trips: ${error.message}`)
       } else {
         setTrips(data)
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
                 <strong>{trip.name}</strong>
                 {trip.description ? ` — ${trip.description}` : ''}
               </li>
             ))}
           </ul>
         )}
       </main>
     )
   }