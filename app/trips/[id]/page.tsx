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

   export default function TripPage() {
     const params = useParams()
     const router = useRouter()
     const tripId = params.id as string

     const [trip, setTrip] = useState<Trip | null>(null)
     const [members, setMembers] = useState<Member[]>([])
     const [loading, setLoading] = useState(true)
     const [notFound, setNotFound] = useState(false)
     const [inviteEmail, setInviteEmail] = useState('')
     const [message, setMessage] = useState('')

     useEffect(() => {
       supabase.auth.getSession().then(({ data }) => {
         if (!data.session) {
           router.push('/login')
         } else {
           fetchTrip()
           fetchMembers()
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

     async function handleInvite() {
       if (!inviteEmail.trim()) {
         setMessage('Enter an email address.')
         return
       }

       // Check if that email already belongs to a registered user
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
       <main style={{ padding: '2rem' }}>
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
         <p><em>Itinerary, expenses, chat, and photos will go here.</em></p>
       </main>
     )
   }