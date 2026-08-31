   'use client'

   import { useState } from 'react'
   import { supabase } from '@/lib/supabase'

   export default function LoginPage() {
     const [email, setEmail] = useState('')
     const [password, setPassword] = useState('')
     const [message, setMessage] = useState('')

     async function handleSignUp() {
       const { error } = await supabase.auth.signUp({ email, password })
       setMessage(error ? `Error: ${error.message}` : 'Signed up! Check your email to confirm.')
     }

     async function handleLogin() {
       const { error } = await supabase.auth.signInWithPassword({ email, password })
       setMessage(error ? `Error: ${error.message}` : 'Logged in successfully!')
     }

     return (
       <main style={{ padding: '2rem', maxWidth: '400px' }}>
         <h1>Trip Planner Login</h1>
         <input
           type="email"
           placeholder="Email"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           style={{ display: 'block', margin: '1rem 0', padding: '0.5rem', width: '100%' }}
         />
         <input
           type="password"
           placeholder="Password"
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           style={{ display: 'block', margin: '1rem 0', padding: '0.5rem', width: '100%' }}
         />
         <button onClick={handleSignUp} style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}>
           Sign Up
         </button>
         <button onClick={handleLogin} style={{ padding: '0.5rem 1rem' }}>
           Log In
         </button>
         <p>{message}</p>
       </main>
     )
   }