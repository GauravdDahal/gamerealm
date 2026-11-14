import { redirect } from 'next/navigation'

// Old address: the player list moved to /admin/players.
export default function Clients() {
    redirect('/admin/players')
}
