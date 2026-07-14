import { Box, Flex, Button, Heading, Spacer } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';

function NavItem({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Button
      asChild
      variant={isActive ? 'solid' : 'ghost'}
      colorPalette={isActive ? 'blue' : 'gray'}
      size="sm"
      mx={1}
    >
      <Link to={to}>{label}</Link>
    </Button>
  );
}

export function Navbar() {
  return (
    <Box
      bg="white"
      _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
      borderBottom="1px solid"
      borderColor="gray.200"
      px={8}
      py={4}
    >
      <Flex alignItems="center">
        <Heading size="md" color="blue.500" mr={8}>
          <Link to="/">Manhwa Tracker</Link>
        </Heading>

        <Flex>
          <NavItem to="/dashboard" label="Dashboard" />
          <NavItem to="/library" label="Library" />
        </Flex>

        <Spacer />

        <Button size="sm" colorPalette="gray" variant="outline">
          Settings
        </Button>
      </Flex>
    </Box>
  );
}
