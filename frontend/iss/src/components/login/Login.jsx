import "./login.css"
import { useState } from "react"
import classnames from "classnames"

function Login() {
    const [isActive, setActive] = useState(false);
    const confirmAccount = (e) => {
        console.log(e.target[0].value)
        e.target.reset();
        e.preventDefault()

    }


    return (
        <div className="login-outer">
            <div className={classnames("container", { active: isActive })}>
                <div className="form-box login">

                    <form action="" onSubmit={(e) => confirmAccount(e)}>
                        <h1>Login</h1>
                        <div className="input-box">
                            <input type="text" placeholder="Username" required name="username" />
                            <i className='bx bxs-user'></i>
                        </div>
                        <div className="input-box">
                            <input type="password" placeholder="Password" required name="password" />
                            <i className='bx bxs-lock-alt'></i>
                        </div>
                        <div className="forgot-link">
                            <a href="#">Forgot password?</a>
                        </div>
                        <button type="submit" className="btn" >Login</button>

                    </form>


                </div>


                <div className="form-box register">

                    <form action="">
                        <h1>Registeration</h1>
                        <div className="input-box">
                            <input type="text" placeholder="Username" required />
                            <i className='bx bxs-user'></i>
                        </div>
                        <div className="input-box">
                            <input type="password" placeholder="Password" required />
                            <i className='bx bxs-lock-alt'></i>
                        </div>

                        <button type="submit" className="btn">Register</button>

                    </form>


                </div>

                <div className="toggle-box">
                    <div className="toggle-panel toggle-left">
                        <h1>Hello, Welcome!</h1>
                        <p>Don't have an account?</p>
                        <button className="btn register-btn" onClick={() => setActive(true)}>Register</button>
                    </div>
                    <div className="toggle-panel toggle-right">
                        <h1>Welcome Back!</h1>
                        <p>Already have an account?</p>
                        <button className="btn login-btn" onClick={() => setActive(false)}>Login</button>
                    </div>
                </div>



            </div>

        </div>


    )




}
export default Login