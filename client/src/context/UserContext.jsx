import { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  // undefined = session check in progress, null = anonymous, object = logged in
  const [user, setUser] = useState(undefined);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

UserProvider.propTypes = { children: PropTypes.node.isRequired };

export function useUser() {
  return useContext(UserContext);
}
