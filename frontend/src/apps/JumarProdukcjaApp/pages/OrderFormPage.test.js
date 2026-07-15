import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderFormPage from './OrderFormPage';
import apiClient from '../../../api/client';

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock('../../../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}), { virtual: true });

const metadataResponse = {
  data: {
    status: [{ value: 0, label: 'Planowane' }],
    priority: [{ value: 1, label: 'Średni' }],
    foil_types: [{ value: 0, label: 'HDPE' }],
  },
};

function getField(name) {
  const field = document.querySelector(`[name="${name}"]`);
  if (!field) {
    throw new Error(`Field ${name} not found`);
  }
  return field;
}

async function fillRequiredOrderFields() {
  await userEvent.type(screen.getByLabelText(/artykuł/i), 'Test zlecenia');
  await userEvent.clear(screen.getByLabelText(/ilośćzlec/i));
  await userEvent.type(screen.getByLabelText(/ilośćzlec/i), '12000');
  await userEvent.clear(screen.getByLabelText(/szerworka/i));
  await userEvent.type(screen.getByLabelText(/szerworka/i), '300');
  await userEvent.clear(screen.getByLabelText(/szerrękawa/i));
  await userEvent.type(screen.getByLabelText(/szerrękawa/i), '360');
  await userEvent.clear(screen.getByLabelText(/długworka/i));
  await userEvent.type(screen.getByLabelText(/długworka/i), '500');
  await userEvent.clear(screen.getByLabelText(/grubworka/i));
  await userEvent.type(screen.getByLabelText(/grubworka/i), '35');
  await userEvent.clear(screen.getByLabelText(/ilośćrolekzlec/i));
  await userEvent.type(screen.getByLabelText(/ilośćrolekzlec/i), '6');
  await userEvent.clear(screen.getByLabelText(/długrolkizlec korekta/i));
  await userEvent.type(screen.getByLabelText(/długrolkizlec korekta/i), '1015');
}

describe('OrderFormPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    apiClient.get.mockResolvedValue(metadataResponse);
    apiClient.post.mockResolvedValue({ data: { id: 1 } });
  });

  test('updates calculated fields while typing', async () => {
    render(<OrderFormPage />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('meta/orders/'));
    await fillRequiredOrderFields();

    await waitFor(() => {
      expect(getField('Zakladka').value).toBe('30');
      expect(getField('WagaFoliZlec').value).toBe('143.64');
      expect(getField('DlugFoliPlan').value).toBe('6000');
      expect(getField('DlugRolkiPlan').value).toBe('1000');
      expect(getField('DlugFoliZlec_Korekta').value).toBe('6090');
      expect(getField('WagaRolkiZlec').value).toBe('23.94');
    });
  });

  test('submits calculated values when creating an order', async () => {
    render(<OrderFormPage />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('meta/orders/'));
    await fillRequiredOrderFields();
    await userEvent.click(screen.getByRole('button', { name: /^zapisz$/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        'orders/',
        expect.objectContaining({
          Artykul: 'Test zlecenia',
          Kod: '',
          MMK: '',
          Barwnik: '',
          Zakladka: 30,
          WagaFoliZlec: 143.64,
          DlugFoliPlan: 6000,
          DlugRolkiPlan: 1000,
          DlugFoliZlec_Korekta: 6090,
          WagaRolkiZlec: 23.94,
          Uwagi: '',
        })
      )
    );

    expect(mockNavigate).toHaveBeenCalledWith('/zlecenia/planowanie');
  });
});
