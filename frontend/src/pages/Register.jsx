import Form from "../components/Form";

function Register() {
  // route="/register" => will become "http://127.0.0.1:5000/register"
  return <Form route="/register" method="register" />;
}

export default Register;
