// Fail-closed sample: every construct below is outside the converter subset.
import { useState } from "react";
import { Button, TextField } from "@aphrody/m3-baseui";

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(0);
  return (
    <div style={{ position: "sticky", display: "grid" }}>
      <TextField {...props} label={props.label} />
      {count > 0 && <p>Clicked {count} times</p>}
      <Button onClick={() => setCount(count + 1)}>Add</Button>
      <Marquee>legacy</Marquee>
    </div>
  );
}
