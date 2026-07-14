import { useState } from 'react';
import {
  Dialog, Button, Input, Field, Stack, Text,
} from '@chakra-ui/react';
import { trpc } from '@/lib/trpc';

export function AddManhwaModal() {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const add = trpc.manhwa.addFromUrl.useMutation({
    onSuccess: () => {
      utils.manhwa.getAll.invalidate();
      setUrl('');
      setOpen(false);
    },
  });

  const handleSubmit = () => {
    if (!url.trim()) return;
    add.mutate({ url: url.trim() });
  };

  const supportedSites = [
    'AsuraScans (asuracomic.net)',
    'Webtoon (webtoons.com)',
    'ReaperScans (reaperscans.com)',
    'Manhuaus (manhuaus.com)',
  ];

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Trigger asChild>
        <Button colorPalette="blue" size="sm">
          + Add Manhwa
        </Button>
      </Dialog.Trigger>

      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Add Manhwa from URL</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            <Stack gap={4}>
              <Field.Root>
                <Field.Label>Manhwa URL</Field.Label>
                <Input
                  placeholder="https://asuracomic.net/series/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <Field.HelperText>
                  Supported: {supportedSites.join(', ')}
                </Field.HelperText>
              </Field.Root>

              {add.error && (
                <Text color="red.500" fontSize="sm">
                  {add.error.message}
                </Text>
              )}
            </Stack>
          </Dialog.Body>

          <Dialog.Footer>
            <Dialog.ActionTrigger asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </Dialog.ActionTrigger>
            <Button
              colorPalette="blue"
              size="sm"
              onClick={handleSubmit}
              loading={add.isPending}
              loadingText="Fetching..."
            >
              Add to Library
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
