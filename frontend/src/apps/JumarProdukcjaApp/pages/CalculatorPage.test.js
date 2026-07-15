import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalculatorPage from './CalculatorPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

describe('CalculatorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('navigates to the order form with prefilled values from the calculator', async () => {
    render(<CalculatorPage />);

    await userEvent.selectOptions(screen.getByLabelText(/rodzaj folii/i), '1');
    await userEvent.selectOptions(screen.getByLabelText(/taśma/i), '1');
    await userEvent.type(screen.getByLabelText(/szerworka/i), '300');
    await userEvent.type(screen.getByLabelText(/szerrękawa/i), '360');
    await userEvent.type(screen.getByLabelText(/grubworka/i), '35');
    await userEvent.type(screen.getByLabelText(/waga produkcja/i), '100');
    await userEvent.click(screen.getByRole('button', { name: /utwórz zlecenie/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/formularz_zlecenia_produkcyjne', {
      state: {
        prefill: {
          Rodzaj: 1,
          Tasma: true,
          SzerWorka: '300',
          SzerRekawa: '360',
          GrubWorka: '35',
          DlugWorka: '1000',
          IloscZlec: '8354.22',
        },
      },
    });
  });
});
