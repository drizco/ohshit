import { useState, useContext } from 'react'
import Link from 'next/link'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import GavelIcon from '@mui/icons-material/Gavel'
import CloseIcon from '@mui/icons-material/Close'
import SettingsContext from '../context/SettingsContext'
import styles from '../styles/components/header.module.scss'

const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const { mute, dark, setMute, setDark } = useContext(SettingsContext)

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event.type === 'keydown' &&
        ((event as React.KeyboardEvent).key === 'Tab' ||
          (event as React.KeyboardEvent).key === 'Shift')
      ) {
        return
      }
      setIsDrawerOpen(open)
    }

  const handleSound = () => setMute((prev) => !prev)
  const handleDark = () => setDark((prev) => !prev)
  const toggleRules = () => {
    setShowRules(!showRules)
    setIsDrawerOpen(false) // Close drawer when rules open
  }

  return (
    <>
      <header id={styles.header}>
        <Link href="/" className={styles.img_container}>
          <img src="/images/poop.png" alt="Oh Shit Logo" />
        </Link>
        <h1>oh shit</h1>

        <IconButton
          onClick={toggleDrawer(true)}
          edge="end"
          color="inherit"
          aria-label="menu"
          sx={{ ml: 'auto' }}
        >
          <MenuIcon />
        </IconButton>
      </header>

      {/* Side Menu Drawer */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 280, pt: 2 }} role="presentation">
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              Settings
            </Typography>
            <IconButton onClick={toggleDrawer(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleDark}>
                <ListItemIcon>{dark ? <LightModeIcon /> : <DarkModeIcon />}</ListItemIcon>
                <ListItemText primary={dark ? 'Light Mode' : 'Dark Mode'} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton onClick={handleSound}>
                <ListItemIcon>{mute ? <VolumeOffIcon /> : <VolumeUpIcon />}</ListItemIcon>
                <ListItemText primary={mute ? 'Unmute Sounds' : 'Mute Sounds'} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton onClick={toggleRules}>
                <ListItemIcon>
                  <GavelIcon />
                </ListItemIcon>
                <ListItemText primary="Rules" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Rules Dialog */}
      <Dialog
        open={showRules}
        onClose={() => setShowRules(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
              rules
            </Typography>
            <IconButton onClick={() => setShowRules(false)} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ color: 'text.primary' }}>
          <Typography variant="body1" gutterBottom>
            oh shit is a classic card game. it can be played with anywhere from 2 to 51
            players (technically), but it&apos;s best with 4 to 10.
          </Typography>

          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
            rounds
          </Typography>
          <Typography variant="body1" gutterBottom>
            the number of rounds is determined by the number of cards chosen when the host
            initiates a new game. starting with five cards means five cards will be dealt
            to each player in the first round. in the second round, four cards are dealt,
            then three, two, one, and back up to five. so a five card game will last 9
            rounds, and a ten card game will last 19 rounds.
          </Typography>

          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
            playing the game
          </Typography>
          <Box component="ol" sx={{ pl: 3 }}>
            <li>
              <Typography variant="body1">
                cards are dealt in order, starting with the player following the dealer.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                after the cards are dealt, the next card in the deck is used to determine
                the trump suit for the round.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                each player must now bid for how many tricks they believe they will win in
                the round. players can bid from zero to the max number of tricks in the
                round (see bidding and scoring). start with the player following the
                dealer and bid in order.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                the player following the dealer plays a card.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                in turn, each player plays a card. if a player has a card in their hand
                that matches the suit that was lead, they must follow suit and play it. if
                not, they can play any other card, including a trump card if they choose.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                after each player has played one card, the winner of the trick is
                determined. the player who played the highest card of the suit that was
                lead wins the tick, unless trump was played. if trump was played because a
                player was not able to follow suit, the player who played the highest
                trump card wins the trick.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                the winner of the trick leads off the next trick.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                repeat 1-7 until all tricks in the round have been played.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                record the scores and deal the next round (see bidding and scoring).
              </Typography>
            </li>
          </Box>

          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
            card rank and trump
          </Typography>
          <Typography variant="body1" gutterBottom>
            cards are ranked from two (lowest) to ace (highest). the trump suit is
            determined after all cards have been dealt. when a trump card is played, it is
            ranked higher than any card of the suit that was lead. for example, if clubs
            are trump and the &apos;Ace of Diamonds&apos; was lead, a player lacking a
            diamond could play the &apos;Two of Clubs&apos; and be in the best position to
            win the trick. unless a higher trump is played...
          </Typography>

          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
            bidding and scoring
          </Typography>
          <Typography variant="body1" gutterBottom>
            players make their bids at the start of each round, guessing at how many
            tricks they will win. bidding begins with the player after the dealer, and
            goes in turn until it ends with the dealer. if the &apos;dirty bids only&apos;
            option was chosen when initiating the game, the dealer is forbidden from
            making a bid that would ensure the total bids match the total available bids.
            meaning, it will not be possible for every player to make their bid.
          </Typography>

          <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
            at the end of each round, players earn 10 bonus points if they bid correctly,
            as well as one point for each trick they win. if the &apos;earn points for bad
            bids&apos; option was chosen when initiating the game, one point is earned for
            each trick won, regardless of whether the player made their bid correctly.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Header
