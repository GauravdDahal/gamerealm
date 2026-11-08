/**
 * "Play" on a game: signed-out players go to sign in, players waiting for
 * approval go to the pending page, everyone else gets the support chat opened
 * with a ready-made request that carries the game's banner.
 */
export const playGame = ({ game, user, authLoading, router }) => {
    if (authLoading) return
    if (!user) return router.push('/users')
    if (user.is_admin) return
    if (user.is_approved === false) return router.push('/account-pending')
    window.dispatchEvent(
        new CustomEvent('open-game-chat', {
            detail: { title: game.title, image: game.image },
        }),
    )
}
