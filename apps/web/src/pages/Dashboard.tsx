import { Box, Heading, SimpleGrid, Card, Stat, Spinner, Center, Text, Badge } from '@chakra-ui/react';
import { trpc } from '@/lib/trpc';

export function DashboardPage() {
  const { data: manhwas, isLoading } = trpc.manhwa.getAll.useQuery();

  const totalManhwa = manhwas?.length ?? 0;
  const completedCount = manhwas?.filter(
    (m) => m.progress?.status === 'completed'
  ).length ?? 0;
  const readingCount = manhwas?.filter(
    (m) => m.progress?.status === 'reading'
  ).length ?? 0;

  if (isLoading) {
    return (
      <Center h="60vh">
        <Spinner size="xl" colorPalette="blue" />
      </Center>
    );
  }

  return (
    <Box p={8} maxW="7xl" mx="auto">
      <Heading mb={2}>Dashboard</Heading>
      <Text color="gray.500" mb={8}>Your manhwa reading overview</Text>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
        <Card.Root>
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Total Manhwa</Stat.Label>
              <Stat.ValueText>{totalManhwa}</Stat.ValueText>
              <Stat.HelpText>In your library</Stat.HelpText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Currently Reading</Stat.Label>
              <Stat.ValueText color="blue.500">{readingCount}</Stat.ValueText>
              <Stat.HelpText>Active series</Stat.HelpText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Completed</Stat.Label>
              <Stat.ValueText color="green.500">{completedCount}</Stat.ValueText>
              <Stat.HelpText>Finished series</Stat.HelpText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {manhwas && manhwas.length > 0 && (
        <Box mt={10}>
          <Heading size="md" mb={4}>Recently Updated</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {manhwas.slice(0, 6).map((m) => (
              <Card.Root key={m.id} _hover={{ shadow: 'md' }} transition="all 0.2s">
                <Card.Body>
                  <Heading size="sm" mb={1} lineClamp={1}>{m.title}</Heading>
                  <Badge colorPalette={
                    m.progress?.status === 'reading' ? 'blue' :
                    m.progress?.status === 'completed' ? 'green' : 'gray'
                  } size="sm">
                    {m.progress?.status ?? 'plan_to_read'}
                  </Badge>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
}
