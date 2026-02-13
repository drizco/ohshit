import React from 'react'
import Header from './Header'
// import InviteModal from "./InviteModal";

const Layout = (props) => {
  const { children } = props

  return (
    <>
      <Header />
      {children}
      {/* <InviteModal /> */}
    </>
  )
}

export default Layout
