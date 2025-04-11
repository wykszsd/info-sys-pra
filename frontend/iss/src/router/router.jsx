import { createBrowserRouter } from 'react-router'
import App from "../App"
import Login from "../components/login/Login"
const router = createBrowserRouter(
    [
        {
            path: '/',
            element: <Login />

        }



    ]
)
// 配置路由

export default router