import Form from "../components/Form";

function Login() {
  // route="/login" => will become "http://127.0.0.1:5000/login"
  return <Form route="/login" method="login" />;
}

export default Login;
