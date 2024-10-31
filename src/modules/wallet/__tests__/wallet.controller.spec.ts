import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from '../wallet.controller';
import { WalletService } from '../wallet.service';
import { TrustService } from '../../trust/trust.service';
import * as uuid from 'uuid';
import { Wallet } from '../entity/wallet.entity';
import { TrustFilterDto } from '../../trust/dto/trust-filter.dto';
import { Trust } from '../../trust/entity/trust.entity';
import {
  ENTITY_TRUST_REQUEST_TYPE,
  ENTITY_TRUST_STATE_TYPE,
  ENTITY_TRUST_TYPE,
} from '../../trust/trust-enum';
import { HttpStatus, HttpException } from '@nestjs/common';

describe('WalletController', () => {
  let walletController: WalletController;
  let walletService: WalletService;
  let trustService: TrustService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: {
            getById: jest.fn(),
            batchTransferWallet: jest.fn(),
          },
        },
        {
          provide: TrustService,
          useValue: {
            getTrustRelationships: jest.fn(),
          },
        },
      ],
    }).compile();

    walletController = module.get<WalletController>(WalletController);
    walletService = module.get<WalletService>(WalletService);
    trustService = module.get<TrustService>(TrustService);
  });

  it('getById', async () => {
    const walletId1 = uuid.v4();
    const walletStub = { id: walletId1, name: 'walletId1' } as Wallet;
    jest.spyOn(walletService, 'getById').mockResolvedValue(walletStub);

    const wallet = await walletController.getById(walletId1);

    expect(wallet.id).toBe(walletId1);
    expect(wallet.name).toBe('walletId1');
    expect(walletService.getById).toHaveBeenCalledWith(walletId1);
  });

  it('getTrustRelationships', async () => {
    const walletId = uuid.v4();
    const query: TrustFilterDto = {
      walletId,
      state: ENTITY_TRUST_STATE_TYPE.requested,
      type: ENTITY_TRUST_TYPE.send,
      request_type: ENTITY_TRUST_REQUEST_TYPE.send,
      offset: 0,
      limit: 10,
      sort_by: 'created_at',
      order: 'DESC',
    };

    const trustRelationships: Trust[] = [
      {
        id: uuid.v4(),
        actor_wallet_id: walletId,
        target_wallet_id: uuid.v4(),
        type: ENTITY_TRUST_TYPE.send,
        originator_wallet_id: uuid.v4(),
        request_type: ENTITY_TRUST_REQUEST_TYPE.send,
        state: ENTITY_TRUST_STATE_TYPE.requested,
        created_at: new Date(),
        updated_at: new Date(),
        active: true,
      },
    ];

    jest
      .spyOn(trustService, 'getTrustRelationships')
      .mockResolvedValue(trustRelationships);

    const result = await walletController.getTrustRelationships(
      walletId,
      query,
    );

    expect(trustService.getTrustRelationships).toHaveBeenCalledWith({
      walletId,
      ...query,
    });
    expect(result).toEqual(trustRelationships);
  });

  it('batchTransfer - success', async () => {
    const transferData = {
      sender_wallet: 'sender_wallet_name',
      token_transfer_amount_default: 100,
      wallet_id: 'sender_wallet_id',
      csvJson: [
        {
          wallet_name: 'recipient_wallet_1',
          token_transfer_amount_overwrite: 50,
        },
        { wallet_name: 'recipient_wallet_2' },
      ],
      filePath: '/path/to/file.csv',
    };

    jest
      .spyOn(walletService, 'batchTransferWallet')
      .mockResolvedValue({ message: 'Batch transfer successful' });

    const result = await walletController.batchTransfer(
      transferData.sender_wallet,
      transferData.token_transfer_amount_default,
      transferData.wallet_id,
      transferData.csvJson,
      transferData.filePath,
    );

    expect(result).toEqual({ message: 'Batch transfer successful' });
    expect(walletService.batchTransferWallet).toHaveBeenCalledWith(
      transferData.sender_wallet,
      transferData.token_transfer_amount_default,
      transferData.wallet_id,
      transferData.csvJson,
      transferData.filePath,
    );
  });

  it('batchTransfer - failure', async () => {
    const transferData = {
      sender_wallet: 'sender_wallet_name',
      token_transfer_amount_default: 100,
      wallet_id: 'sender_wallet_id',
      csvJson: [
        {
          wallet_name: 'recipient_wallet_1',
          token_transfer_amount_overwrite: 50,
        },
        { wallet_name: 'recipient_wallet_2' },
      ],
      filePath: '/path/to/file.csv',
    };

    jest
      .spyOn(walletService, 'batchTransferWallet')
      .mockRejectedValue(
        new HttpException(
          'Failed to process batch transfer',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );

    await expect(
      walletController.batchTransfer(
        transferData.sender_wallet,
        transferData.token_transfer_amount_default,
        transferData.wallet_id,
        transferData.csvJson,
        transferData.filePath,
      ),
    ).rejects.toThrow(HttpException);

    expect(walletService.batchTransferWallet).toHaveBeenCalledWith(
      transferData.sender_wallet,
      transferData.token_transfer_amount_default,
      transferData.wallet_id,
      transferData.csvJson,
      transferData.filePath,
    );
  });
});
