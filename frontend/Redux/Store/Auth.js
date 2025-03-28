import React, { useReducer, useState, useEffect } from "react";
import authReducer from "../Reducers/Auth.reducer";
import AuthGlobal from './AuthGlobal';

const Auth = props => {
    const [stateUser, dispatch] = useReducer(authReducer, {
        isAuthenticated: null,
        user: {}
    });
    const [showChild, setShowChild] = useState(false);

    useEffect(() => {
        setShowChild(true);
        return () => {
            setShowChild(false);
        };
    }, []);

    if (!showChild) {
        return null;
    } else {
        return (
            <AuthGlobal.Provider
                value={{
                    stateUser,
                    dispatch
                }}
            >
                {props.children}
            </AuthGlobal.Provider>
        )
    }
};

export default Auth;