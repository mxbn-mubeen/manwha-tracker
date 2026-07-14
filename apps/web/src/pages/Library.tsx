import {
  Box, Heading, SimpleGrid, Card, Image, Text, Badge,
  Button, Spinner, Center, Flex, Input, HStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { AddManhwaModal } from '@/features/manhwa/components/AddManhwaModal';

export function LibraryPage() {
  const { data: manhwas, isLoading } = trpc.manhwa.getAll.useQuery();
  const [search, setSearch] = useState('');

  const filtered = manhwas?.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box p={8} maxW="7xl" mx="auto">
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading mb={1}>Library</Heading>
          <Text color="gray.500">{manhwas?.length ?? 0} manhwa tracked</Text>
        </Box>
        <AddManhwaModal />
      </Flex>

      <HStack mb={6}>
        <Input
          placeholder="Search your library..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW="360px"
        />
      </HStack>

      {isLoading ? (
        <Center h="40vh">
          <Spinner size="xl" colorPalette="blue" />
        </Center>
      ) : filtered && filtered.length > 0 ? (
        <SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 5 }} gap={5}>
          {filtered.map((m) => (
            <Card.Root
              key={m.id}
              overflow="hidden"
              _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              cursor="pointer"
            >
              {m.coverUrl ? (
                <Image
                  src={m.coverUrl}
                  alt={m.title}
                  aspectRatio={2 / 3}
                  objectFit="cover"
                  w="full"
                />
              ) : (
                <Box
                  aspectRatio={2 / 3}
                  bg="gray.100"
                  _dark={{ bg: 'gray.700' }}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="gray.400" fontSize="sm">No cover</Text>
                </Box>
              )}
              <Card.Body p={3}>
                <Text fontWeight="semibold" fontSize="sm" lineClamp={2} mb={2}>
                  {m.title}
                </Text>
                <Badge
                  colorPalette={
                    m.progress?.status === 'reading' ? 'blue' :
                    m.progress?.status === 'completed' ? 'green' : 'gray'
                  }
                  size="sm"
                >
                  Ch. {m.progress?.lastChapter ?? 0}
                </Badge>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      ) : (
        <Center h="40vh" flexDirection="column" gap={4}>
          <Text color="gray.400" fontSize="lg">
            {search ? 'No results found' : 'Your library is empty'}
          </Text>
          {!search && <AddManhwaModal />}
        </Center>
      )}
    </Box>
  );
}
