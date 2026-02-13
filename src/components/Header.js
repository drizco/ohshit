import { useState, useContext, useEffect } from 'react'
import Link from 'next/link'
import { Modal, ModalHeader, ModalBody } from 'reactstrap'
import SettingsContext from '../context/SettingsContext'
import styles from '../styles/components/header.module.scss'
import { Sound, Mute, Sun, Moon } from '../components/Icons'

const Header = () => {
  const [showRules, setShowRules] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { mute, dark, setMute, setDark } = useContext(SettingsContext)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const toggleRules = () => {
    setShowRules(!showRules)
  }

  const handleSound = () => {
    setMute((prevMute) => !prevMute)
  }

  const handleDark = () => {
    setDark((prevDark) => !prevDark)
  }

  return (
    <>
      <header id={styles.header}>
        <Link href="/" className={styles.img_container}>
          <img src="/images/poop.png" alt="Oh Shit Logo" />
        </Link>
        <h1>oopsie poopsie...</h1>

        <div className={styles.rules}>
          {mounted && (
            <>
              <div title={dark ? 'Light mode' : 'Dark mode'} onClick={handleDark}>
                {dark ? (
                  <Sun className={styles.icon} />
                ) : (
                  <Moon className={styles.icon} />
                )}
              </div>
              <div
                title={`Notification sounds ${mute ? 'muted' : 'active'}`}
                onClick={handleSound}
              >
                {mute ? (
                  <Mute className={styles.icon} />
                ) : (
                  <Sound className={styles.icon} />
                )}
              </div>
            </>
          )}
          <button onClick={toggleRules}>
            <h4 className="red-text">rules</h4>
          </button>
        </div>
      </header>
      <Modal
        centered
        size="lg"
        isOpen={showRules}
        toggle={toggleRules}
        contentClassName="rules-modal"
      >
        <ModalHeader tag={'h2'} toggle={toggleRules}>
          rules
        </ModalHeader>
        <ModalBody>
          <p>
            oopsie poopsie is a version of the classic card game, oh shit. it can be
            played with anywhere from 2 to 51 players (technically), but it&apos;s best
            with 4 to 10.
          </p>

          <h2 className="mb-3">rounds</h2>
          <p>
            the number of rounds is determined by the number of cards chosen when the host
            initiates a new game. starting with five cards means five cards will be dealt
            to each player in the first round. in the second round, four cards are dealt,
            then three, two, one, and back up to five. so a five card game will last 9
            rounds, and a ten card game will last 19 rounds.
          </p>
          <h2 className="mb-3">playing the game</h2>
          <ol>
            <li>
              cards are dealt in order, starting with the player following the dealer.
            </li>
            <li>
              after the cards are dealt, the next card in the deck is used to determine
              the trump suit for the round.
            </li>
            <li>
              each player must now bid for how many tricks they believe they will win in
              the round. players can bid from zero to the max number of tricks in the
              round (see bidding and scoring). start with the player following the dealer
              and bid in order.
            </li>
            <li>the player following the dealer plays a card.</li>
            <li>
              in turn, each player plays a card. if a player has a card in their hand that
              matches the suit that was lead, they must follow suit and play it. if not,
              they can play any other card, including a trump card if they choose.
            </li>
            <li>
              after each player has played one card, the winner of the trick is
              determined. the player who played the highest card of the suit that was lead
              wins the tick, unless trump was played. if trump was played because a player
              was not able to follow suit, the player who played the highest trump card
              wins the trick.
            </li>
            <li>the winner of the trick leads off the next trick.</li>
            <li>repeat 1-7 until all tricks in the round have been played.</li>
            <li>record the scores and deal the next round (see bidding and scoring).</li>
          </ol>
          <h2 className="mb-3">card rank and trump</h2>
          <p>
            cards are ranked from two (lowest) to ace (highest). the trump suit is
            determined after all cards have been dealt. when a trump card is played, it is
            ranked higher than any card of the suit that was lead. for example, if clubs
            are trump and the &apos;Ace of Diamonds&apos; was lead, a player lacking a
            diamond could play the &apos;Two of Clubs&apos; and be in the best position to
            win the trick. unless a higher trump is played...
          </p>

          <h2 className="mb-3">bidding and scoring</h2>
          <p>
            players make their bids at the start of each round, guessing at how many
            tricks they will win. bidding begins with the player after the dealer, and
            goes in turn until it ends with the dealer. if the &apos;dirty bids only&apos;
            option was chosen when initiating the game, the dealer is forbidden from
            making a bid that would ensure the total bids match the total available bids.
            meaning, it will not be possible for every player to make their bid.
          </p>

          <p>
            at the end of each round, players earn 10 bonus points if they bid correctly,
            as well as one point for each trick they win. if the &apos;earn points for bad
            bids&apos; option was chosen when initiating the game, one point is earned for
            each trick won, regardless of whether the player made their bid correctly.
          </p>
        </ModalBody>
      </Modal>
    </>
  )
}

export default Header
