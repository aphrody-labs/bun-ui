// Login form: a centered card with text fields, a checkbox and two buttons.
import { Button, Card, Checkbox, Divider, TextField } from "@aphrody/m3-baseui";
import "./login.css";

export function LoginForm({ onSignIn, onForgotPassword, onEmailChange }: LoginProps) {
  return (
    <main className="screen">
      <Card variant="elevated" className="login-card">
        <h1 className="md-typescale-headline-small">Sign in to Bun OS</h1>
        <p className="subtitle">Use your Aphrody account.</p>
        <TextField id="email" label="Email" type="email" variant="outlined" onInput={onEmailChange} />
        <TextField id="password" label="Password" type="password" variant="outlined" onSubmit={onSignIn} />
        <Checkbox id="remember" label="Keep me signed in" checked />
        <Divider />
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Button variant="text" onClick={onForgotPassword}>Forgot password?</Button>
          <Button variant="filled" onClick={onSignIn}>Sign in</Button>
        </div>
      </Card>
    </main>
  );
}
