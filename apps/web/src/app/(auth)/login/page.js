import { redirect } from 'next/navigation'

/** The old sign-in address. Everything now signs in at /users. */
export default function Login() {
    redirect('/users')
}
