import status from "http-status";
import { PaymentStatus, Role } from "../../../generated/prisma/enums";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import AppError from "../../../errorHelpers/AppError";

const getDashboardStatsData = async (user: IRequestUser) => {
  let statsData;

  switch (user.role) {
    case Role.SUPER_ADMIN:
      statsData = await getSuperAdminStatsData();
      break;

    case Role.ADMIN:
      statsData = await getAdminStatsData();
      break;

    case Role.USER:
      statsData = await getCustomerStatsData(user);
      break;

    default:
      throw new AppError(status.BAD_REQUEST, "Invalid user role");
  }

  return statsData;
};

// ✅ SUPER ADMIN
const getSuperAdminStatsData = async () => {
  const [userCount, productCount, orderCount, paymentCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.payment.count(),
  ]);

  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: PaymentStatus.PAID },
  });

  const pieChartData = await getPieChartData();
  const barChartData = await getBarChartData();

  return {
    userCount,
    productCount,
    orderCount,
    paymentCount,
    totalRevenue: totalRevenue._sum.amount || 0,
    pieChartData,
    barChartData,
  };
};

// ✅ ADMIN
const getAdminStatsData = async () => {
  const [productCount, orderCount, customerCount] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: Role.USER } }),
  ]);

  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: PaymentStatus.PAID },
  });

  return {
    productCount,
    orderCount,
    customerCount,
    totalRevenue: totalRevenue._sum.amount || 0,
  };
};

// ✅ CUSTOMER
const getCustomerStatsData = async (user: IRequestUser) => {
  const [orders, reviews] = await Promise.all([
    prisma.order.count({ where: { userId: user.userId as string } }),
    prisma.review.count({ where: { userId: user.userId } }),
  ]);

  return {
    orders,
    reviews,
  };
};

// ✅ PIE CHART
const getPieChartData = async () => {
  const [paid, unpaid] = await Promise.all([
    prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
    prisma.payment.count({ where: { status: PaymentStatus.UNPAID } }),
  ]);

  return [
    { name: "Paid", value: paid },
    { name: "Unpaid", value: unpaid },
  ];
};

// ✅ BAR CHART (Monthly Revenue)
const getBarChartData = async () => {
  const result = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "createdAt") as month,
           SUM(amount) as total
    FROM "Payment"
    WHERE status = 'PAID'
    GROUP BY month
    ORDER BY month ASC
  `;

  return result;
};

export const StatsService = {
  getDashboardStatsData,
};