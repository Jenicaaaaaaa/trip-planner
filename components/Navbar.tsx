   'use client'

   import { useEffect, useState } from 'react'
   import { supabase } from '@/lib/supabase'
   import Link from 'next/link'

   export default function Navbar() {
     const [email, setEmail] = useState<string | null>(null)

     useEffect(() => {
       supabase.auth.getSession().then(({ data }) => {
         setEmail(data.session?.user.email ?? null)
       })

       const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
         setEmail(session?.user.email ?? null)
       })

       return () => {
         listener.subscription.unsubscribe()
       }
     }, [])

     async function handleLogout() {
       await supabase.auth.signOut()
     }

     return (
       <nav style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333' }}>
         <Link href="/">Trip Planner</Link>
         <div>
           {email ? (
             <>
               <span style={{ marginRight: '1rem' }}>{email}</span>
               <button onClick={handleLogout}>Log Out</button>
             </>
           ) : (
             <Link href="/login">Log In</Link>
           )}
         </div>
       </nav>
     )
   }