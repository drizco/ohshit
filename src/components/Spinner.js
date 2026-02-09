import { Spinner } from "reactstrap"
import { useContext } from "react"
import CombinedContext from "../context/CombinedContext"
import { PINK, RED } from "../utils/constants"

const SpinnerComponent = ({ loading }) => {
  const { dark } = useContext(CombinedContext)
  return loading ? (
    <div
      className="spinner-container"
      style={{
        backgroundColor: dark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.3)"
      }}
    >
      <Spinner
        style={{ width: "3rem", height: "3rem", color: dark ? PINK : RED }}
      />
    </div>
  ) : null
}

export default SpinnerComponent
